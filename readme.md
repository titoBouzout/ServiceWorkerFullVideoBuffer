# Fully Buffer a HTML5 Video with Service Workers

The specification of the `preload` attribute on a `Video` element won't allow you to fully buffer a video. This repo solves that.

Furthermore, browser heuristics make it so you only buffer what you will "probably" see from a video. Presumably, this is to save bandwidth for the most common case. Browsers won't buffer longer than a few seconds from your cursor position.

The main problem is that `pause` won't fill the buffer till the end. It will stop buffering near where your cursor is. This is an elegant solution for high-speed connections. The issue arises when people have unstable, unreliable, or slow connections. This is usually the result of location or using hotspots. The default buffering behaviour that browsers provide, results in these unfavourable conditions being unable to watch a video on the video tag itself. It will just spin once in a while and forever till the end.

The workarounds of having to download a video to be able to watch it later, as most people with unreliable connections do, means that you lose all the features that such a tag provides. You cannot watch videos in sync with your friends, for example.

This solves this problem by using Service Workers. It listens to `fetch` events and when a video is found, it starts to download it non-stop till the end. Then, when the video tag does a `range` request, the Service Worker is capable of satisfying these ranges if the data is available. When the data is not available, the Service Worker lets the browser do its thing.

So you can do the old-school pause a video to make it buffer half-fully, and start watching while it's still downloading! Improving the experience for users with unreliable connections. A huge time saver.

## How to use it?

In your website, do something like the following to include the service worker

```html
<script>
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker
				.register('/service-worker.js')
				.then(function (registration) {
					registration.update()
				})
				.catch(console.log)
		})
	}
</script>
```

On the service worker, edit the extensions of the videos that you want to fully buffer, and the URL umbrella on which these videos are.

```js
// extensions to hook
let extensions = /\.mp4$/

// under which URL?
let under = /https:\/\/example\.net\/videos\//
```

## What does this do

This will listen for `fetch` requests as defined by your `extensions`(as in file extensions) and `under` vars. As soon as a video that match is found, it will fetch ranges of 3mb in size, till the end of the video. It will keep the video in memory and then satisfy any `range` request that could be satisfied. When a range cannot be satisfied, it will let the browser do its usual thing. This is done this way so the browser can display data/video as soon as possible.

## Caveats

- As we use it to watch lengthy videos, we delete any video in memory if the video URL changes
- If you close the tab, the video will be still in memory. However, this has the (perhaps desirable) effect that refreshing the tab, or closing it by mistake, will not lose the cache. Not sure how to handle this, as not really familiar with Service Worker behaviours.
- It continuously posts the percent of the video that has been downloaded to the tab via a postMessage. This may not be ideal, but you can change it very easily.
- It will keep the video in memory as an array buffer, so you should have enough RAM for it.
- It will spam the console, this is just too new to remove debug messages.

## Inspiration

We have had this problem for years. One of our friends uses a hotspot, and discarding them as "your internet is not good enough", wasn't an acceptable solution. To work around the difficulty, a full buffer button was added. Which made us wait, till our friend had fully fetched the video. Time to watch was download time + video length. Completely unacceptable having to wait so much without options to "buffer while you watch".
Looking for solutions, we entered a Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1290913
We didn't get the response we wanted and made us think harder on the concern. This led us to investigate the fetch listener of Services Workers, which thankfully just worked.

## Authors

- Tito Bouzout https://github.com/titoBouzout
- Kilo https://github.com/boredofnames
