import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

const apiResponseTime = new Trend('pizza_response_time');  // Track response time for the API requests

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
        'pizza_response_time': ['p(95)<300']  // Custom threshold for the pizza_response_time metric
    }
};

export default function () {

    const response = http.get('https://quickpizza.grafana.com/');
    apiResponseTime.add(response.timings.waiting);
    //response.timings.duration = 
    //DNS lookup+
    //TCP connection+
    //TLS handshake+(If HTTPS)
    //Sending request (HTTP request)
    //Waiting for response (Server processing time)+
    //Receiving response (HTTP response download time)

    check(response, {
        'Status code is 200': (r) => r.status === 200,
        'Page contains pizza': (r) => r.body.includes('pizza')
    });

    sleep(1);

    const response2 = http.get('https://quickpizza.grafana.com',{
        tags: { name: 'API' } // Custom tag for this request
    });
}