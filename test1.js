import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    vus: 3,
    duration: '10s'
};

export default function () {

    const response = http.get('https://quickpizza.grafana.com/');

    check(response, {
        'Status code is 200': (r) => r.status === 200
    });

    sleep(1);
}
// http_req_duration -> Time taken for request + Time taken for response