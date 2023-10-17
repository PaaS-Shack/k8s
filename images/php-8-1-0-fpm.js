
/**
 * This is a definition of the docker.io/libary/php:8.1.0-fpm image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    // name of the image
    name: "php-8-1-0-fpm",
    // namespace of the image
    namespace: "library",
    // tag of the image
    tag: "8.1.0-fpm",
    // digest of the image
    digest: 'sha256:001281a0eb6140b0e5096664d785abd6e6d2921316d002c1d912867725076299',
    // image name with tag
    image: "php:8.1.0-fpm",
    // registry of the image
    registry: "docker.io",
    // repository of the image
    repository: "library/php",
    // description of the image
    description: "php is a widely used, open-source php management system (php).",
    // image pull policy
    imagePullPolicy: "IfNotPresent",
    // image pull secrets
    imagePullSecrets: [],
    // ports of the image
    ports: [
        {
            name: "php",
            port: 9000,
            protocol: "TCP"
        }
    ],
    // env of the image
    env: [
        {
            key: "PHP_ROOT_PASSWORD",
            type: "secret"
        },
    ],
    // volumes of the image
    volumes: [
        {
            name: "php-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/www/html"
        }
    ],
    // resources of the image
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
    // readiness probe of the image
    readinessProbe: {
        exec: {
            command: [
                "php",
                "-v"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    // liveness probe of the image
    livenessProbe: {
        exec: {
            command: [
                "php",
                "-v"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
};