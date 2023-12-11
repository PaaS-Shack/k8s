
/**
 * This is the definition of the strapi deployment image.
 * strapi/strapi:3.6.8-alpine
 * 
 */

const FIELDS = require("../fields");

module.exports = {
    name: "strapi",
    namespace: "strapi",
    tag: "3.6.8-alpine",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "strapi/strapi:3.6.8-alpine",
    registry: "docker.io",
    repository: "strapi/strapi",
    description: "baisc strapi deployment",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 1337,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "DATABASE_CLIENT",
            type: "as",
            value: "mysql"
        },
        {
            key: "mysql.provisions",
            type: "provision"
        },
        {
            key: "DATABASE_HOST",
            type: "map",
            value: "MYSQL_HOST"
        },
        {
            key: "DATABASE_PORT",
            type: "map",
            value: "MYSQL_PORT"
        },
        {
            key: "DATABASE_NAME",
            type: "map",
            value: "MYSQL_DATABASE"
        },
        {
            key: "DATABASE_USERNAME",
            type: "map",
            value: "MYSQL_USERNAME"
        },
        {
            key: "DATABASE_PASSWORD",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "strapi-data",
            type: "persistentVolumeClaim",
            mountPath: "/srv/app"
        }
    ],
    resources: {
        limits: {
            cpu: 250,
            memory: 250,
        },
        requests: {
            cpu: 50,
            memory: 40,
        }
    },
    labels: [],
    annotations: [],
};

