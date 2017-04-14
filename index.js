var msgListeners = {}, triggered = {}, msg, current;
if (typeof self !== 'undefined' && self.addEventListener) {
	self.addEventListener('message', parseRemoteMessage, false);
	current = self;
} else {
	current = null;
}
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
	navigator.serviceWorker.addEventListener('message', parseRemoteMessage, false);
}

/**
 * Handle messages which came from a different window or worker
 */
function parseRemoteMessage(event) {
	try {
		msg = JSON.parse(event.data);
	} catch (e) {
		event.preventDefault();
		return;
	}
	if (msg.type) trigger(msg.type, msg, event.source, false);
}

/**
 * Listen for messages of a given type
 */
function listen(type, callback, internalonly) {
	if (!msgListeners[type]) msgListeners[type] = [];
	msgListeners[type].push({
		callback: callback,
		ext: !internalonly
	});
}
function unlisten(type, callback) {
	if (msgListeners[type]) for (var ii in msgListeners[type]) {
		if (msgListeners[type][ii].callback == callback) return delete msgListeners[type][ii];
	}
	return false;
}
		  
/*
* Calls callback if message has already happened (passing most recent value), then listens for future calls
*
* Only works for internal messages
* 
*/
function listenExisting(type, callback) {
	listen(type, callback, true);
	if (triggered.hasOwnProperty(type)) {
		callback(triggered[type], current);
	}

}

/*
 * Calls callback if message has already happened, otherwise listens for it once
 * 
 * Only works for internal messages
 * 
 */
function waitFor(type, callback) {
	function callbackwrapper(msg) {
		unlisten(type, callbackwrapper, true);
		callback(msg, current);
	}
	listenExisting(type, callbackwrapper, true);
}

function trigger(type, msg, source, internal) {
	if (internal) triggered[type] = msg;
	if (msgListeners[type]) for (var ii in msgListeners[type]) {
		if (internal || msgListeners[type][ii].ext) msgListeners[type][ii].callback(msg, source);
	}
}
function send(type, msg, target) {
	if (!target || target == current) return trigger(type, msg, current, true);
	if (!msg) msg = {};
	msg.type = type;
	var encodedMessage = JSON.stringify(msg);
	if (typeof Window === "function" && target instanceof Window) {
		target.postMessage(encodedMessage, '*');
	} else {
		target.postMessage(encodedMessage);
	}
}
function clientBroadcast(type, msg) {
	if (typeof self === 'undefined' || !self.clients || !self.clients.matchAll) return;
	self.clients.matchAll().then(function(clients) {
		clients.forEach(function (client) {
			send(type, msg, client);
		});
	});
}
exports = {
	send: send,
	listen: listen,
	unlisten: unlisten,
	waitFor: waitFor,
	listenExisting: listenExisting,
	clientBroadcast: clientBroadcast,
}
module.exports = exports;