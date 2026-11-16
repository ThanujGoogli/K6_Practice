import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    
    stages:[
        {duration:'4s',target:2},  //Ramp up to 2 users over 4 seconds
        {duration:'5s',target:5},  //Ramp up to 5 users over 5 seconds
        {duration:'3s',target:0}   //Ramp down to 0 users over 3 seconds
    ],
    thresholds: {
        http_req_duration: ['p(95)<400'],
        http_req_failed: ['rate<0.1'],
        checks: ['rate>0.9'], // More than 90% of checks must pass
        'http_req_duration{name: "API"}': ['p(95)<500'],
        'http_req_failed{name: "API"}': ['rate<0.1'],
    }
};

export default function () {

    const response = http.get('https://quickpizza.grafana.com/');

    check(response, {
        'Status code is 200': (r) => r.status === 200,
        'Page contains pizza': (r) => r.body.includes('pizza')
    });

    sleep(1);

    const response2 = http.get('https://quickpizza.grafana.com',{
        tags: { name: 'API' } // Custom tag for this request
    });
}