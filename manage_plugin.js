const fs = require("fs");
const chalk = require("chalk");
const axios = require("axios");
const https = require("https");
const request = require("request");
require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();

var config = {
    token: "",
    base_url: ""
}

const agent = new https.Agent({
    rejectUnauthorized: false,
    strictSSL: false
});

readini();

if (config.token == "" && process.argv.length < 4) {
    console.log(chalk.red("Insufficient Parameters"));
    console.log(chalk.yellow("NOTE: If token is included in config.json command line argument is not required"));
    console.log(chalk.blue("Usage: node manage_plugin.js {action} {token}"));
    process.exit(5);
} else if (config.token == "") {
    config.token = process.argv[3];
}

eval(process.argv[2] + "()");

async function deploy() {
    console.log(chalk.yellow("Deploying Plugin to Production"));
    //Read Manifest
    var plugin_config = JSON.parse(fs.readFileSync("./dist/manifest.json"));

    //Get Plugins
    var plugins = await getPlugins();

    //Search for plugin with same name
    for(var i = 0; i<plugins.length; i++) {
        var plugin = plugins[i];
        if(plugin.pluginName == plugin_config.name){
            //Delete if found
            await deletePlugin(plugin.id);
            break;
        }
    }

    //Register Plugin
    var id = await registerPlugin({
        "pluginName": plugin_config.name,
        "vendor": plugin_config.vendor,
        "description": plugin_config.description,
        "version": plugin_config.version,
        "license": plugin_config.license,
        "link": plugin_config.link,
        "provider_scoped": plugin_config.scope.includes("service-provider"),
        "tenant_scoped": plugin_config.scope.includes("tenant"),
        "enabled": true
    });

    //Enable Plugin Upload
    url = "";
    (await enablePluginUpload(id)).match(/<(.*?)>/g).map(val => {
        url = val.replace(/<|>|/g, '');
    });

    //Upload Plugin
    uploadPlugin(url);
}

function registerPlugin(plugin_config) {
    return new Promise((resolve, reject) => {
        console.log("Registering New Plugin");
        axios.post(config.base_url + "/cloudapi/extensions/ui", plugin_config, {
            headers: {
                'x-vcloud-authorization': config.token,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            httpsAgent: agent,
        }).then(resp => {
            resolve(resp.data.id);
        }).catch(err => {
            reject(err);
        });
    });
}

function enablePluginUpload(id) {
    return new Promise((resolve, reject) => {
        console.log("Enabling Upload for Plugin: " + id);
        axios.post(config.base_url + "/cloudapi/extensions/ui/" + id + "/plugin", {fileName: "plugin.zip"}, {
            headers: {
                'x-vcloud-authorization': config.token,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            httpsAgent: agent
        }).then(resp => {
            resolve(resp.headers.link);
        }).catch(err => {
            reject(err);
        });
    });
}

function uploadPlugin(url) {
    return new Promise((resolve, reject) => {
        console.log("Uploading Plugin Files");
        var plugin = fs.createReadStream("./dist/plugin.zip");

        request({
            method: 'PUT',
            url: url,
            headers: {
                'x-vcloud-authorization': config.token,
                'Content-Type': 'application/octet-stream'
            },
            strictSSL: false,
            body: plugin
        }, err => {
            return err ? reject(err) : resolve (null);
        });
    });
}

function deletePlugin(id) {
    return new Promise((resolve, reject) => {
        console.log("Removing Plugin: " + id);
        axios.delete(config.base_url + "/cloudapi/extensions/ui/" + id, {
            headers: {
                'x-vcloud-authorization': config.token
            },
            httpsAgent: agent
        }).then(resp => {
            resolve();
        }).catch(err => {
            reject(err);
        });
    });
}

function getPlugins() {
    return new Promise((resolve, reject) => {
        console.log("Getting Plugins");
        axios.get(config.base_url + "/cloudapi/extensions/ui", {
            headers: {
                'x-vcloud-authorization': config.token
            },
            httpsAgent: agent
        }).then(resp => {
            resolve(resp.data);
        }).catch(err => {
            reject(err);
        });
    });
}


function readini() {
    var obj = JSON.parse(fs.readFileSync('./config.json'));
    config.token = obj.auth_token;
    config.base_url = obj.base_url;
}