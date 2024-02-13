
/**
 * this is the defanition of the grafana image
 * 
 * grafana/grafana:10.0.11
 */
const FIELDS = require("../fields");

module.exports = {
    name: "grafana-10-0-11",
    namespace: "grafana",
    tag: "10.0.11",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/grafana/grafana:10.0.11",
    registry: "docker.io",
    repository: "grafana/grafana",
    description: "Grafana is the open source analytics & monitoring solution for every database",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 3000,
            protocol: "HTTP"
        }
    ],
    env: [],
    volumes: [
        {
            name: "grafana-storage",
            type: "persistentVolumeClaim",
            mountPath: "/var/lib/grafana"
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
            "value": "grafana"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ],
};