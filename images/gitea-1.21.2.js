/**
 * this is a defenition file for gitea
 * 
 * gitea/gitea:1.21.2
 */


const FIELDS = require("../fields");

module.exports = {
    name: "gitea-1-21-2",
    namespace: "gitea",
    tag: "1.21.2",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/gitea/gitea:1.21.2",
    registry: "docker.io",
    repository: "gitea/gitea",
    description: "Gitea (Git with a cup of tea) is a painless self-hosted Git service written in Go",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 3000,
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
            key: "DB_PASSWD",
            type: "map",
            value: "MYSQL_PASSWORD"
        }
    ],
    volumes: [
        {
            name: "gitea-data",
            type: "persistentVolumeClaim",
            mountPath: "/data"
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
    labels: [
        {
            "key": "app",
            "value": "gitea"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ],
}