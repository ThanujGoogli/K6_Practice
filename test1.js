import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    vus: 3,
    duration: '10s',

    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.9'] // More than 90% of checks must pass
    }
};

export default function () {

    const response = http.get('https://quickpizza.grafana.com/');

    check(response, {
        'Status code is 200': (r) => r.status === 200,
    });

    sleep(1);
}
// http_req_duration -> Time taken for request + Time taken for response