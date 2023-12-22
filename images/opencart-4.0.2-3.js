/**
 * this is the defination of the open cart image by bitnami
 * 
 * bitnami/opencart:4.0.2-3
 */

const FIELDS = require("../fields");

module.exports = {
    name: "opencart-4-0-2-3",
    namespace: "bitnami",
    tag: "4.0.2-3",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/bitnami/opencart:4.0.2-3",
    registry: "docker.io",
    repository: "bitnami/opencart",
    description: "OpenCart is an open source PHP-based online shopping cart system. A robust e-commerce solution for Internet merchants with the ability to create their own online business and participate in e-commerce at a minimal cost. OpenCart is designed feature rich, easy to use, search engine friendly and with a visually appealing interface.",
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
            key: "OPENCART_DATABASE_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "OPENCART_DATABASE_PORT_NUMBER",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "OPENCART_DATABASE_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },
        {
            key: "OPENCART_DATABASE_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "OPENCART_DATABASE_PASSWORD",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "opencart-data",
            type: "persistentVolumeClaim",
            mountPath: "/bitnami/opencart"
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
            "value": "opencart"
        },
        {
            "key": "tier",
            "value": "frontend"
        }
    ],
}