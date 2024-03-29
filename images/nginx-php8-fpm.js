
/**
 * This is a definition of the tangramor/nginx-php8-fpm:php8.2.10_node20.6.0 image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");


module.exports = {
    name: "tangramor-nginx-php8-fpm",
    namespace: "tangramor",
    tag: "php8.2.10_node20.6.0",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "tangramor/nginx-php8-fpm:php8.2.10_node20.6.0",
    registry: "docker.io",
    repository: "tangramor/nginx-php8-fpm",
    description: "nginx-php8-fpm is a widely used, open-source nginx-php8-fpm management system (nginx-php8-fpm).",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "nginx-php8-fpm",
            port: 80,
            protocol: "HTTP"
        }
    ],
    env: [
        {
            key: "NGINX_PHP8_FPM_ROOT_PASSWORD",
            type: "secret"
        },
    ],
    volumes: [
        {
            name: "nginx-php8-fpm-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/www/html"
        }
    ],
    resources: {
        limits: {
            cpu: 500,// 500m
            memory: 500,// 500Mi
        },
        requests: {
            cpu: 100,// 100m
            memory: 20,// 20Mi
        }
    },
    readinessProbe: {
        exec: {
            command: [
                "nginx",
                "-t"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    livenessProbe: {
        exec: {
            command: [
                "nginx",
                "-t"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    configMap: {
        name: 'nginx-php8-fpm-config',
        data: {}
    },
}