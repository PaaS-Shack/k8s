/**
 * this is the defanition of the code-server
 * 
 * registry.one-host.ca:443/one-host/docker-code-server:master
 */

const FIELDS = require("../fields");

module.exports = {
    name: "code-server",
    namespace: "one-host",
    tag: "master",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "registry.one-host.ca:443/one-host/docker-code-server:master",
    registry: "registry.one-host.ca:443",
    repository: "one-host/docker-code-server",
    description: "code-server is VS Code running on a remote server, accessible through the browser.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 8080,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "PASSWORD",
            type: "password"
        }
    ],
    volumes: [
        {
            name: "local",
            type: "persistentVolumeClaim",
            mountPath: "/home/coder/.local"
        },
        {
            name: "config",
            type: "persistentVolumeClaim",
            mountPath: "/home/coder/.config"
        },
        {
            name: "workspace",
            type: "persistentVolumeClaim",
            mountPath: "/home/coder/code"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 128
        },
        limits: {
            cpu: 1000,
            memory: 1024
        }
    }
};