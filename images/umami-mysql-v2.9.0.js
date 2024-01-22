/**
 * docker pull ghcr.io/umami-software/umami:mysql-v2.9.0
 * 
 * this is the umami mysql image 
 */


const FIELDS = require("../fields");

module.exports = {
    name: "umami-mysql-v2-9-0",
    namespace: "umami-software",
    tag: "mysql-v2.9.0",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "ghcr.io/umami-software/umami:mysql-v2.9.0",
    registry: "ghcr.io",
    repository: "umami-software/umami",
    description: "Umami is a simple, fast, website analytics alternative to Google Analytics.",
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
            key: "DATABASE_TYPE",
            value: "mysql"
        },
        {
            key: "DATABASE_URL",
            type: "map",
            value: "mysql://MYSQL_USERNAME:MYSQL_PASSWORD@MYSQL_HOST:MYSQL_PORT/MYSQL_DATABASE"
        }
    ],
    resources: {
        requests: {
            cpu: "100m",
            memory: "128Mi"
        },
        limits: {
            cpu: "1000m",
            memory: "1024Mi"
        }
    },
    labels: [
        {
            "key": "app",
            "value": "umami"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ]
};