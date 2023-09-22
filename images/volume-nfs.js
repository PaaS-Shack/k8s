/**
 * This is a definition of the k8s.gcr.io/volume-nfs:0.8 image.
 * Runs a nfs server that can be used for remote storage.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");


module.exports = {
    name: "volume-nfs",
    namespace: "k8s.gcr.io",
    tag: "0.8",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "volume-nfs:0.8",
    registry: "k8s.gcr.io",
    repository: "volume-nfs",
    description: "Runs a nfs server that can be used for remote storage.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    args: [
        
    ],
    ports: [
        {
            name: "nfs",
            port: 2049,
            protocol: "TCP"
        }, {
            name: "mountd",
            port: 20048,
            protocol: "TCP"
        }, {
            name: "rpcbind",
            port: 111,
            protocol: "TCP"
        }
    ],
    env: [
        
    ],
    volumes: [
        {
            name: "exports",
            type: "hostPath",
            mountPath: "/exports",
            hostPath:{
                path: "/data/nfs",
                type: "DirectoryOrCreate"
            }
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
        exec: {
            command: [
                "sh",
                "-c",
                "test -f /exports/ready"
            ]
        },
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 2,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        exec: {
            command: [
                "sh",
                "-c",
                "test -f /exports/ready"
            ]
        },
        initialDelaySeconds: 5,
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
            "value": "volume-nfs"
        }
    ],
}