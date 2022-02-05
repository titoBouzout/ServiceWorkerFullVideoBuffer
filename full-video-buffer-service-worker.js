self.addEventListener('install', () => {
	self.skipWaiting()
})

// extensions to hook
let extensions = /\.mp4$/

// under which url?
let under = /https:\/\/example\.net\/videos\//

// the main object that keeps the video in memory and replies to request listening to fetch
let downloaded = {}

// this is the buffer size, it continuously downloads 3mb chunks of the video. Till the end of it.
let length = 3000000

// to tell the tab how much of the video we downloaded
let Client

self.addEventListener('fetch', async function (event) {
	if (!event.request.headers.has('range')) return
	let range = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1])
	let url = event.request.url

	function reply() {
		return new Promise((resolve, reject) => {
			let buff = downloaded[url].buffer.slice(range)
			// send small slices and not the whole video!
			// else the sandbox will run out of memory
			let fuff = buff.slice(0, length)
			console.log('replying', fuff)
			resolve(
				new Response(fuff, {
					status: 206,
					statusText: 'Partial Content',
					headers: [
						[
							'Content-Range',
							'bytes ' + range + '-' + (range + fuff.byteLength - 1) + '/' + downloaded[url].size,
						],
						['x-made-by', 'Tito'],
					],
				}),
			)
		})
	}

	// only catch special videos
	if (extensions.test(url) && under.test(url)) {
		if (!downloaded[url]) {
			console.log('url is', url)
			console.log('length is', length)

			// delete old videos and to cancel buffering of current video if any
			downloaded = {}

			downloaded[url] = {
				range: 0,
				buffer: new ArrayBuffer(),
				size: 0,
				done: false,
				amountBuffered: 0,
			}

			// do not stall the loading video
			setTimeout(function () {
				download(url, event)
			}, 100)
		}
		console.log('range is', range)

		// get the client to send the buffering % message
		clients
			.get(event.clientId)
			.then(client => {
				if (client) {
					Client = client
				}
			})
			.catch(console.log)

		// if the range can be satisfied, reply with it
		// if not, let the browser do the normal thing, so the video loads as fast as possible
		if (
			downloaded[url] &&
			downloaded[url].buffer &&
			downloaded[url].buffer.byteLength - 1 > range
		) {
			event.respondWith(reply())
		}

		// always tell the browser how much we buffered
		if (Client && downloaded[url].amountBuffered) {
			try {
				Client.postMessage(downloaded[url].amountBuffered)
			} catch (e) {}
		}
	}
})

function download(url, event) {
	// if the buffer was cancelled return
	if (!downloaded[url]) {
		return
	}

	let start = downloaded[url].range
	let end = downloaded[url].range + length - 1

	// do not overflow the range
	if (downloaded[url].size > 0 && end > downloaded[url].size) {
		end = downloaded[url].size
	}

	console.log('downloading bytes=' + start + '-' + end)

	// fetch with the range
	fetch(url, {
		headers: {
			'content-type': 'multipart/byteranges',
			'range': 'bytes=' + start + '-' + end,
		},
	})
		.then(response => {
			// if the buffer was cancelled return

			if (!downloaded[url]) {
				return
			}
			console.log('length is', +response.headers.get('Content-Length'))
			console.log('size is', +response.headers.get('Content-Range').split('/')[1])
			console.log('downlaoded is', downloaded[url].buffer.byteLength)
			downloaded[url].size = +response.headers.get('Content-Range').split('/')[1]

			// are we done?
			if (+response.headers.get('Content-Length') < length) {
				downloaded[url].done = true
			}
			return response.arrayBuffer()
		})
		.then(buffer => {
			// if the buffer was cancelled return
			if (!downloaded[url]) {
				return
			}

			// save the data
			downloaded[url].buffer = concatBuffers(downloaded[url].buffer, buffer)
			downloaded[url].range += length

			// update the browser buffered amount
			if (Client) {
				let one = downloaded[url].size / 100
				try {
					downloaded[url].amountBuffered = downloaded[url].buffer.byteLength / one
					Client.postMessage(downloaded[url].amountBuffered)
				} catch (e) {}
			}

			// keep downloading or exit
			if (downloaded[url].done) {
				console.log('done!', end, downloaded[url].size)
			} else {
				console.log(end, downloaded[url].size)
				download(url, event)
			}
		})
		.catch(function () {
			// if the buffer was cancelled return
			if (!downloaded[url]) {
				return
			}
			// on error keep trying
			download(url, event)
		})
}

function concatBuffers(buffer1, buffer2) {
	var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
	tmp.set(new Uint8Array(buffer1), 0)
	tmp.set(new Uint8Array(buffer2), buffer1.byteLength)
	return tmp.buffer
}
