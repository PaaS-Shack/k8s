/**
 * this is the defanition of the mongo-express image
 * 
 * library/mongo-express:1.0.2-20
 */
const FIELDS = require("../fields");

module.exports = {
    name: "mongo-express-1-0-2-20",
    namespace: "library",
    tag: "1.0.2-20",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/library/mongo-express:1.0.2-20",
    registry: "docker.io",
    repository: "library/mongo-express",
    description: "Web-based MongoDB admin interface, written with Node.js and express",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 8081,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "ME_CONFIG_BASICAUTH_USERNAME",
            type: "username"
        },
        {
            key:"ME_CONFIG_BASICAUTH_PASSWORD",
            type: "secret"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 128
        },
        limits: {
            cpu: 200,
            memory: 256
        }
    },
    labels: [
        {
            "key": "app",
            "value": "mongo-express"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ],
};
    