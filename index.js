let CONFIG = {
	iceServers: [{
		urls: ["stun:stun.1.google.com:19302"]
	}]
};
let ID = Date.now().toString(36) + Math.random().toString(36).substr(2);

let REGISTER = document.querySelector("button");
let CLIPBOARD = document.querySelector("button[data-type=clipboard]");
let TEXT = {
	_el: document.querySelector("textarea"),
	set value(obj) {
		obj = {
			...obj,
			candidates: FND.candidates
		};
		this._el.value = JSON.stringify(obj, null, 4);
	},
	get value() {
		try {
			return JSON.parse(this._el.value);
		} catch(err) {
			return {};
		}
	},
	get raw() {
		return this._el.value;
	}
};
let LOG = document.querySelector("pre");

globalThis.FND = {};
let CONN = FND.conn = establishConnection();

REGISTER.addEventListener("click", async ev => {
	let { offer, answer, candidates = [] } = TEXT.value;
	if(answer) {
		log("[PEER A] processing answer");
		answer = new RTCSessionDescription(answer);
		CONN.setRemoteDescription(answer);
	} else if(offer) {
		log("[PEER B] processing offer");
		let offer = new RTCSessionDescription(TEXT.value.offer);
		CONN.setRemoteDescription(offer);

		let answer = await CONN.createAnswer();
		CONN.setLocalDescription(answer);
		TEXT.value = { answer };
	} else if(!CONN.localDescription) {
		let chan = CONN.createDataChannel("sendChannel");
		registerChannel(chan);

		log("[PEER A] creating offer");
		let offer = await CONN.createOffer();
		CONN.setLocalDescription(offer);
		TEXT.value = { offer };
		return;
	}

	for(let can of candidates) {
		log("[PEER] registering candidate");
		CONN.addIceCandidate(new RTCIceCandidate(can));
	}
});

CLIPBOARD.addEventListener("click", async ev => {
	let btn = ev.target
	btn.classList.add("is-pending");

	await navigator.clipboard.writeText(TEXT.raw);

	setTimeout(() => {
		btn.classList.remove("is-pending");
	}, 1000);
});

function registerChannel(chan) {
	chan.addEventListener("open", ev => {
		console.log("[DATA] open");
		chan.send(`hello from ${ID}`);
	});
	chan.addEventListener("close", ev => {
		console.log("[DATA] close");
	});
	chan.addEventListener("message", ev => {
		let { data } = ev;
		console.log("[DATA] message", data);
		if(data.startsWith("hello from ")) {
			let id = data.substr(11);
			chan.send(`hi, ${id}, I'm ${ID}`);
		}
	});
	FND.chan = chan;
}

function establishConnection() {
	let conn = new RTCPeerConnection(CONFIG);

	let candidates = []
	conn.addEventListener("icecandidate", ev => {
		let { candidate } = ev;
		console.log("[ICE]", candidate);
		if(candidate) {
			candidates.push(candidate);
		} else {
			console.log("[ICE]", candidates);
			FND.candidates = candidates;
		}

		TEXT.value = TEXT.value; // XXX: hacky
	});

	conn.addEventListener("iceconnectionstatechange", ev => {
		console.log("[ICE] state:", ev);
	});

	conn.addEventListener("icecandidateerror", ev => {
		console.log("[ICE] error:", ev);
	});

	conn.addEventListener("datachannel", ev => {
		console.log("[DATA] channel", ev.channel);
		registerChannel(ev.channel);
	});

	return conn;
}

function log(msg) {
	let el = document.createElement("code");
	el.textContent = msg;
	LOG.insertBefore(el, LOG.firstChild);
}
