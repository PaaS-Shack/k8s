/**
 * This is the definition of the microweber image.
 * 
 * docker pull ghcr.io/paas-shack/docker-microweber:master
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "microweber",
    namespace: "paas-shack",
    tag: "master",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "ghcr.io/paas-shack/docker-microweber:master",
    registry: "ghcr.io",
    repository: "paas-shack/docker-microweber",
    description: "Microweber is an open source drag and drop CMS. The core idea of the software is to let you create your own website, online shop or blog. From this moment of creation, your journey towards success begins. Tagline: Website Builder, CMS, and Online Shop.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 80,
            protocol: "TCP"
        }
    ],
    env: [
        {
            key: "mysql.provisions",
            type: "provision"
        },
        {
            key: "DB_TYPE",
            value: "mysql"
        },
        {
            key: "DB_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "DB_PORT",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "DB_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },{
            key: "DB_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "DB_PASS",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "data",
            type: "persistentVolumeClaim",
            mountPath: "/var/www/html"
        }
    ],
    resources: {
        requests: {
            cpu: "100m",
            memory: "128Mi"
        },
        limits: {
            cpu: "100m",
            memory: "128Mi"
        }
    },
    labels:[
        {
            "key": "app",
            "value": "microweber"
        },
        {
            "key": "tier",
            "value": "frontend"
        }
    ],
}