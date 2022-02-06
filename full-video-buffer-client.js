class BufferVideo {
	startBuffer(url, callback) {
		if (url === this.url) return
		this.url = url
		// chunk size, it continuously download 3mb chunks of the video. Till the end of it.
		this.chunk = 3000000
		// video data
		this.buffer = new ArrayBuffer()
		// current range
		this.range = 0
		// size of video
		this.size = 0
		// is it done?
		this.done = false
		// % buffered
		this.buffered = 0
		// in Mb
		this.speed = 0
		// time tracking
		this.now = Date.now()
		// elapsed time
		this.elapsed = 0
		// remainint time
		this.remaining = 0

		// communication
		this.channel = new BroadcastChannel('service-worker-video-buffering')
		this.channel.addEventListener('message', this.onMessage.bind(this))

		// start download
		this.download(this.url, callback)
	}
	onMessage(event) {
		let data = event.data
		// if the range can be satisfied
		if (data.url === this.url && this.size && this.buffer.byteLength - 1 > data.range) {
			this.channel.postMessage({
				range: data.range,
				buffer: this.buffer.slice(data.range).slice(0, this.chunk),
				size: this.size,
			})
		} else if (data.url === this.url) {
			this.channel.postMessage({
				range: data.range,
				buffer: 0,
				size: 0,
			})
		}
	}
	download(url, callback) {
		// if the buffer was cancelled return
		if (url != this.url) return

		// range
		let start = this.range
		let end = this.range + this.chunk - 1

		// do not overflow the range
		if (this.size > 0 && end > this.size) {
			end = this.size
		}

		// fetch
		// console.log('fetch bytes=' + start + '-' + end)

		fetch(url, {
			headers: {
				'content-type': 'multipart/byteranges',
				'range': 'bytes=' + start + '-' + end,
				'x-made-by': 'https://github.com/titoBouzout/ServiceWorkerVideoFullBuffer',
			},
		})
			.then(response => {
				// if the buffer was cancelled return
				if (url != this.url) return

				this.size = +response.headers.get('Content-Range').split('/')[1]

				// are we done?
				if (+response.headers.get('Content-Length') < this.chunk) {
					this.done = true
				}

				return response.arrayBuffer()
			})
			.then(buffer => {
				// if the buffer was cancelled return
				if (url != this.url) return

				// save the data
				this.buffer = this.concatBuffers(this.buffer, buffer)

				// increase range
				this.range += this.chunk

				// to update the browser with data
				this.buffered = this.buffer.byteLength / (this.size / 100)

				this.elapsed = (Date.now() - this.now) / 1000

				this.speed = (this.buffer.byteLength / 1024 / 1024 / this.elapsed).toFixed(1)

				this.remaining = (this.elapsed / this.buffered) * (100 - this.buffered)

				// can watch  = time that takes to download - time buffered < time buffered

				// callback to update the browser
				callback && callback(this)

				// keep downloading or exit
				if (this.done) {
					console.log('done!', end, this.size)
				} else {
					// console.log(this.buffered, end, this.size)
					this.download(url, callback)
				}
			})
			.catch(e => {
				// if the buffer was cancelled return
				if (url != this.url) return
				console.log('errored, trying again')

				// on error keep trying
				setTimeout(() => this.download(url, callback), 1000)
			})
	}
	concatBuffers(buffer1, buffer2) {
		let b = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
		b.set(new Uint8Array(buffer1), 0)
		b.set(new Uint8Array(buffer2), buffer1.byteLength)
		return b.buffer
	}
}
