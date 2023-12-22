/**
 * This is the definition of the microweber image.
 * 
 * microweber/microweber:v2.0.7
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "microweber-2-0-7",
    namespace: "microweber",
    tag: "v2.0.7",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/microweber/microweber:v2.0.7",
    registry: "docker.io",
    repository: "microweber/microweber",
    description: "Microweber is a Drag and Drop website builder and powerful CMS. It allows you to create your own website, online shop, or blog. From this Docker image, you can launch Microweber with a single click and use it to build your own website. See https://docs.bitnami.com/general/apps/prestashop/ to learn how to get started with PrestaShop.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 80,
            protocol: "HTTP"
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
        },
        {
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
            name: "microweber-data",
            mountPath: "/var/www/html/userfiles"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 256
        },
        limits: {
            cpu: 1000,
            memory: 512
        }
    },
    labels: [
        {
            "key": "app",
            "value": "microweber"
        },
        {
            "key": "tier",
            "value": "frontend"
        }
    ],
};