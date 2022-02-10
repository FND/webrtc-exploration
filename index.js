let CONFIG = {
	iceServers: [{
		urls: ["stun:stun.1.google.com:19302"]
	}]
};

let PEER_A = document.querySelector("button[data-type=peer-a]");
let PEER_B = document.querySelector("button[data-type=peer-b]");
let CLIPBOARD = document.querySelector("button[data-type=clipboard]");
let TEXT = {
	_el: document.querySelector("textarea"),
	set value(obj) {
		this._el.value = JSON.stringify(obj, null, 4);
	},
	get value() {
		try {
			return JSON.parse(this._el.value);
		} catch(err) {
			return null;
		}
	},
	get raw() {
		return this._el.value;
	}
};
let LOG = document.querySelector("pre");

let CONN = establishConnection();
globalThis.FND = { conn: CONN };

PEER_A.addEventListener("click", async ev => {
	if(!TEXT.value) {
		log("[PEER A] creating offer");
		let offer = await CONN.createOffer();
		CONN.setLocalDescription(offer);
		TEXT.value = offer;
		return;
	}

	log("[PEER A] processing answer");
	let answer = new RTCSessionDescription(TEXT.value);
	CONN.setRemoteDescription(answer);
});

PEER_B.addEventListener("click", async ev => {
	log("[PEER B] processing offer");
	let offer = new RTCSessionDescription(TEXT.value);
	CONN.setRemoteDescription(offer);

	let answer = await CONN.createAnswer();
	CONN.setLocalDescription(answer);
	TEXT.value = answer;
});

CLIPBOARD.addEventListener("click", async ev => {
	let btn = ev.target
	btn.classList.add("is-pending");

	await navigator.clipboard.writeText(TEXT.raw);

	setTimeout(() => {
		btn.classList.remove("is-pending");
	}, 1000);
});

function establishConnection() {
	let conn = new RTCPeerConnection(CONFIG);

	conn.addEventListener("icecandidate", ev => {
		console.log("[ICE]", ev.candidate);
	});

	conn.addEventListener("iceconnectionstatechange", ev => {
		console.log("[ICE] state:", ev);
	});

	conn.addEventListener("icecandidateerror", ev => {
		console.log("[ICE] error:", ev);
	});

	conn.addEventListener("datachannel", ev => {
		console.log("[DATA]", ev.channel);

		let receiveChannel = event.channel;
		receiveChannel.onopen = ev => {
			console.log("[DATA] channel is ready");
		};
		receiveChannel.message = ev => {
			console.log("[DATA] message", ev);
		};
	});

	return conn;
}

function log(msg) {
	let el = document.createElement("code");
	el.textContent = msg;
	LOG.insertBefore(el, LOG.firstChild);
}
