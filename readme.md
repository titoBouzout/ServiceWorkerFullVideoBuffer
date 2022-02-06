# Full Video Buffer with Service Workers

The specification of the `preload` attribute on a `Video` element won't allow you to fully buffer a video. This repo solves that.

Furthermore, browser heuristics make it so you only buffer what you will "probably" see from a video. Presumably, this is to save bandwidth for the most common case. Browsers won't buffer longer than a few seconds from your cursor position.

The main problem is that `pause` won't fill the buffer till the end. It will stop buffering near where your cursor is. This is an elegant solution for high-speed connections. The issue arises when people have unstable, unreliable, or slow connections. This is usually the result of location or using hotspots. The default buffering behaviour that browsers provide, results in these unfavourable conditions being unable to watch a video on the video tag itself. It will just spin once in a while and forever till the end.

The workarounds of having to download a video to be able to watch it later, as most people with unreliable connections do, means that you lose all the features that such a tag provides. You cannot watch videos in sync with your friends, for example.

This solves this problem by using Service Workers. After you instruct the library to buffer a video, the Service Worker listens to `fetch` events and will satisfy the ranges requested whenever data is available. When the data is not available, the Service Worker lets the browser do its thing. This is done this way so the browser can display data/video as soon as possible.

So you can do the old-school pause a video to make it buffer for some minutes, and start watching while it's still downloading! Improving the experience for users with unreliable connections. A huge time saver.

## How to use it?

In your website, instance the Service Worker and include the client code which will keep the video in memory to give the ranges to the Service Worker when a video needs data. The video is not kept in memory on the Service Worker, because they are restarted or terminated whenever the browser feels like. You just add a video tag with the same URL that you choose to buffer and the Service Worker will do the work.

```html
<script type="text/javascript" src="/full-video-buffer-client.js"></script>
<script>
	navigator.serviceWorker
		.register('/full-video-buffer-service-worker.js')
		.then(registration => registration.update())
		.catch(console.log)

	// instance the client
	let bufferVideo = new BufferVideo()
	// start buffering a video
	// optionally you can use a callback to display info
	bufferVideo('http://example.net/video.mp4', function (buffer) {
		console.log('The video url is ' + buffer.url)
		console.log('The video size is ' + buffer.size)
		console.log('It downloaded a ' + (buffer.buffered | 0) + '% of the video')
		console.log('Has been downloading for ' + (buffer.elapsed | 0) + ' seconds')
		console.log('It needs ' + (buffer.remaining | 0) + '~ seconds to finish download')
		console.log('It has been downloading at ' + buffer.speed + 'mb/s')
		console.log('Is the download done? ' + (buffer.done ? 'YES' : 'Not yet'))
	})
</script>
```

On the Service Worker, edit the extensions of the videos that you want to fully buffer, and the URL umbrella on which these videos are.

```js
// extensions to hook
let extensions = /\.mp4$/

// under which URL?
let under = /\/video\//
```

You can guess when you can start watching without having any spinning wheel with the following formula:

```js
bufferVideo('http://example.net/video.mp4', function (buffer) {
	// can we start playing while the video buffers?
	let video = document.querySelector('video')
	let watchableTime = (video.duration / 100) * buffer.buffered
	let canWatch = buffer.remaining - watchableTime < watchableTime

	console.log('Can we play the video yet?', canWatch)
})
```

## Inspiration

We have had this problem for years. One of our friends uses a hotspot, and discarding them as "your internet is not good enough", wasn't an acceptable solution. To work around the difficulty, a full buffer button was added. Which made us wait, till our friend had fully fetched the video. Time to watch was download time + video length. Completely unacceptable having to wait so much without options to "buffer while you watch".
Looking for solutions, we entered a Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1290913
We didn't get the response we wanted and made us think harder on the concern. This led us to investigate the fetch listener of Service Workers, which thankfully just worked.

## Authors

- Tito Bouzout https://github.com/titoBouzout
- Kilo https://github.com/boredofnames
