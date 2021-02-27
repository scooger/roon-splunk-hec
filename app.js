"use strict";

// improve console output 
require('console-stamp')(console, 'HH:MM:ss.l');
//require('console-stamp')(console, 'ddd mmm dd yyyy HH:MM:ss')

var commandLineArgs  = require('command-line-args'),
    fs               = require('fs'),
    WebHooks         = require('node-webhooks'),
    RoonApi          = require('node-roon-api'),
    RoonApiSettings  = require('node-roon-api-settings'),
    RoonApiStatus    = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport'),
    RoonApiImage     = require('node-roon-api-image');

var core = undefined;
var transport = undefined;
var zones = [];
var trigger = undefined;
var image = undefined;
var message = undefined;

const optionDefinitions = [
    { name: 'webhook', type: String }
];

var args = commandLineArgs(optionDefinitions);

var roon = new RoonApi({
    extension_id:        'com.travsplk.roonhec',
    display_name:        "Roon to Splunk HEC",
    display_version:     "1.0.0",
    publisher:           'Travis Longwell',
    email:               'notreal@email.com',
	core_paired: function(core_) {
        core = core_;
        image = core.services.RoonApiImage;
        transport = core.services.RoonApiTransport;
        transport.subscribe_zones((response, msg) => {
            if (response == "Subscribed") {
                zones = msg.zones;
            } else if (response == "Changed") {
                if (msg.zones_changed) {
                    zones = msg.zones_changed;
                    zones_changed();
                }
                if (msg.zones_seek_changed) {
                    //console.log(msg.zones_seek_changed);
                }
                if (msg.zones_added) {
                    zones = msg.zones_added;
                }
            }
        });
    },
    core_unpaired: function(core_) {
        core = undefined;
        transport = undefined;
    }
});

var webHooks = new WebHooks({
    db: './webHooksDB.json',
    httpSuccessCodes: [200, 201, 202, 203, 204], })

var emitter = webHooks.getEmitter()
  
emitter.on('*.success', function (shortname, statusCode, body) {
    console.log('Info: Success on trigger webHook ' + shortname + ' with status code', statusCode, 'and body', body)
})
 
emitter.on('*.failure', function (shortname, statusCode, body) {
    console.error('Error: Error on trigger webHook ' + shortname + ' with status code', statusCode, 'and body', body)
})

//remove webHookdsDB.json if your first webhook attempts are unsuccessful
webHooks.add('splunk', args.webhook); 

roon.init_services({
    required_services: [ RoonApiTransport, RoonApiImage ]
});

roon.start_discovery();

function zones_changed() {
    for (var i = 0; i < zones.length; i++) {
        var zone = zones[i];
        var now_playing = zone.now_playing;
        var playback_state = zone.state;
        
        console.log('Info: Building zone [' + zone.display_name + '] playback event [' + playback_state + ']');

        //build event object
        var splunk_event = {
            "state": playback_state,
            "zone_name": zone.display_name,
            "zone_id": zone.zone_id,
            "zone_full" : zone
        }

        if (now_playing != undefined) {
            splunk_event.title = now_playing.three_line.line1;
            splunk_event.artist = now_playing.three_line.line2;
            splunk_event.album = now_playing.three_line.line3;
            splunk_event.length = now_playing.length;
            splunk_event.seek_position = now_playing.seek_position;
        }
                
        console.log('Info: Triggering webhook to send event')
        webHooks.trigger('splunk', splunk_event);
    }
}