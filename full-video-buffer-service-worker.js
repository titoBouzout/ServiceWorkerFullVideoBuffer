self.addEventListener('install', () => self.skipWaiting())

// extensions to hook
let extensions = /\.mp4$/

// under which url?
let under = /\/(video|asset)\//

// listen for messages
let state = {}
let channel = new BroadcastChannel('service-worker-video-buffering')
channel.addEventListener('message', event => {
	let data = event.data
	state[data.range] = data
})

self.addEventListener('fetch', async event => {
	let request = event.request

	let url = request.url

	// only catch videos on our urls and with range
	if (
		request.headers.has('range') &&
		// we need to skip our own requests
		!request.headers.has('x-made-by') &&
		extensions.test(url) &&
		under.test(url)
	) {
		// get the range
		let range = /^bytes\=(\d+)\-$/g.exec(request.headers.get('range'))
		if (!range || !range[1]) return
		range = +range[1]

		// request to the page the data
		channel.postMessage({ url, range })

		event.respondWith(
			(async function () {
				// give time to the page to reply
				// timeout after a whole second
				let i = 0
				while (i < 1000) {
					await sleep(50)
					i += 50
					if (state[range]) break
				}
				// if the range can be satisfied, reply with it
				// if not, let the browser do the normal thing, so the video loads as fast as possible
				if (state[range] && state[range].buffer !== 0) {
					let fuff = state[range]
					console.log('range satisfied')

					let response = new Response(fuff.buffer, {
						status: 206,
						statusText: 'Partial Content',
						headers: [
							[
								'Content-Range',
								'bytes ' + range + '-' + (range + fuff.buffer.byteLength - 1) + '/' + fuff.size,
							],
							['x-made-by', 'https://github.com/titoBouzout/ServiceWorkerVideoFullBuffer'],
						],
					})
					delete state[range]
					return response
				} else {
					console.log('normal fetch')
					// normal fetch
					return fetch(event.request)
				}
			})(),
		)
	}
})

let sleep = ms => new Promise(r => setTimeout(r, ms))
