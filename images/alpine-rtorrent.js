/**
 * This is a definition of the alpine-rtorrent image.
 * 
 * Port 50000 is the port where rTorrent starts to listen. It's important that it would be open/forwarded at firewall and router level in TCP mode.
 * Port 6881 is the port used by DHT. It needs to be open/forwarded in UDP and TCP mode either at firewall and router level.
 * Port 16891 is used by the XMLRPC socket. It is used by third-party applications to fully control rTorrent. 
 * 
 * /home/rtorrent/rtorrent/download This is the directory where downloaded and downloading files are stored.
 * /home/rtorrent/rtorrent/.session This is the directory where rTorrent stores its session files.
 * 
 * docker pull tuxmealux/alpine-rtorrent
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "alpine-rtorrent",
    namespace: "tuxmealux",
    tag: "latest",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/tuxmealux/alpine-rtorrent:latest",
    registry: "docker.io",
    repository: "tuxmealux/alpine-rtorrent",
    description: "Alpine Linux with rtorrent",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "data",
            port: 50000,
            protocol: "TCP"
        },
        {
            name: "dht",
            port: 6881,
            protocol: "UDP"
        },
        {
            name: "xmlrpc",
            port: 16891,
            protocol: "TCP"
        }
    ],
    env: [],
    volumes: [
        {
            name: "data",
            type: "persistentVolumeClaim",
            mountPath: "/home/rtorrent/rtorrent/download"
        },
        {
            name: "session",
            type: "persistentVolumeClaim",
            mountPath: "/home/rtorrent/rtorrent/.session"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 128
        },
        limits: {
            cpu: 100,
            memory: 128
        }
    },
    labels:[
        {
            "key": "app",
            "value": "alpine-rtorrent"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ],
}