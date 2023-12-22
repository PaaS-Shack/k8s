/**
 * this file is a defintion file for prestashop by bitnami
 * 
 * bitnami/prestashop:8.1.2
 */

const FIELDS = require("../fields");

module.exports = {
    name: "prestashop-8-1-2",
    namespace: "bitnami",
    tag: "8.1.2",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/bitnami/prestashop:8.1.2",
    registry: "docker.io",
    repository: "bitnami/prestashop",
    description: "PrestaShop is a free and open-source e-commerce web application, committed to providing the best shopping cart experience for both merchants and customers. It is written in PHP, is highly customizable, supports all the major payment services, is translated in many languages and localized for many countries, has a fully responsive design (both front and back office), etc. See https://docs.bitnami.com/general/apps/prestashop/ to learn how to get started with PrestaShop.",
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
            key: "mysql.provisions",
            type: "provision"
        },
        {
            key: "DB_TYPE",
            value: "mysql"
        },
        {
            key: "PRESTASHOP_DATABASE_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "PRESTASHOP_DATABASE_PORT_NUMBER",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "PRESTASHOP_DATABASE_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },
        {
            key: "PRESTASHOP_DATABASE_USER",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "PRESTASHOP_DATABASE_PASSWORD",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "prestashop-data",
            type: "persistentVolumeClaim",
            mountPath: "/bitnami/prestashop"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 128
        },
        limits: {
            cpu: 500,
            memory: 512
        }
    },
    labels:[
        {
            "key": "app",
            "value": "prestashop"
        },
        {
            "key": "tier",
            "value": "frontend"
        }
    ],
};