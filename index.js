let CONFIG = {
	iceServers: [{
		urls: ["stun:stun.1.google.com:19302"]
	}]
};

let PEER_A = document.querySelector("button:first-of-type");
let PEER_B = document.querySelector("button:last-of-type");
let TEXT = document.querySelector("textarea");
let LOG = document.querySelector("pre");

let CONN = establishConnection();
globalThis.FND = { conn: CONN };

PEER_A.addEventListener("click", async ev => {
	if(!TEXT.value) {
		log("[PEER A] creating offer");
		let offer = await CONN.createOffer();
		CONN.setLocalDescription(offer);
		TEXT.value = JSON.stringify(offer, null, 4);
		return;
	}

	log("[PEER A] processing answer");
	let answer = JSON.parse(TEXT.value);
	let desc = new RTCSessionDescription(answer);
	CONN.setRemoteDescription(desc);
});

PEER_B.addEventListener("click", async ev => {
	log("[PEER B] processing offer");
	let offer = JSON.parse(TEXT.value);
	let desc = new RTCSessionDescription(offer);
	CONN.setRemoteDescription(desc);

	let answer = await CONN.createAnswer();
	CONN.setLocalDescription(answer);
	TEXT.value = JSON.stringify(answer, null, 4);
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
