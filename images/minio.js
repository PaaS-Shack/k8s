
/**
 * This is a definition of the minio 3s image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "minio",
    namespace: "minio",
    tag: "latest",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "minio/minio:latest",
    registry: "docker.io",
    repository: "minio/minio",
    description: "MinIO is a high performance object storage server compatible with Amazon S3 APIs",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    args: [
        "server",
        "--console-address",
        ":9001",
        "/data"
    ],
    ports: [
        {
            name: "minio",
            port: 9000,
            protocol: "HTTP"
        }, {
            name: "minio-console",
            port: 9001,
            protocol: "HTTP",
            subdomain: "console"
        }
    ],
    env: [
        {
            key: "MINIO_ACCESS_KEY",
            type: "username"
        },
        {
            key: "MINIO_SECRET_KEY",
            type: "secret"
        }, {
            key: "MINIO_BROWSER_REDIRECT_URL",
            type: "route",
            index: 1,
            value: "https://${VHOST}"
        }
    ],
    volumes: [
        {
            name: "minio-data",
            type: "persistentVolumeClaim",
            mountPath: "/data"
        }
    ],
    resources: {
        limits: {
            cpu: 100,
            memory: 128
        },
        requests: {
            cpu: 50,
            memory: 64
        }
    },
    readinessProbe: {
        httpGet: {
            path: "/minio/health/ready",
            port: 9000
        },
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        httpGet: {
            path: "/minio/health/live",
            port: 9000
        },
        initialDelaySeconds: 15,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    securityContext: {
        runAsUser: 1000,
        runAsGroup: 1000,
        fsGroup: 1000
    },
    labels: [
        {
            "key": "app",
            "value": "minio"
        }
    ],
}
