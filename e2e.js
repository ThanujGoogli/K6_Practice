import http from 'k6/http';
import { sleep, check,group } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const PASSWORD = "password";

function generateRandomString(length) { 
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

export const options = {

    vus: 2,
    duration: '5s',
}


export default function () {

    let userRegistered = false;
    let USERNAME = `Tester${generateRandomString(10)}1`;

    group('User Registration', function () {

        const registerpayload = JSON.stringify({ username: USERNAME, password: PASSWORD });
        const params = { 'Content-Type': 'application/json' };

        const regresponse = http.post(`${BASE_URL}/api/users`, registerpayload, params
        );

        userRegistered = check(regresponse, {
            'User registered successfully': (r) => r.status === 201,
        });

        if (!userRegistered) {
            console.error(`User registration failed with status code: ${regresponse.status} - ${regresponse.body}`);
            console.error('User registration failed. Exiting the test.');
            return;
        }

        sleep(1);

    })

    group('User Login', function () {

        // STEP 2: Login user
        const registerPayload = JSON.stringify({ username: USERNAME, password: PASSWORD });
        const params = { 'Content-Type': 'application/json' };
        const loginResponse = http.post(
            `${BASE_URL}/api/users/token/login`,
            registerPayload,
            params
        );

        const loginSuccessful = check(loginResponse, {
            'User login successful': (r) => r.status === 200,
            'Auth token received': (r) => !!r.json('token'),
        });

        if (!loginSuccessful) {
            console.error(
                `Login failed: ${loginResponse.status} - ${loginResponse.body}`
            );
            return;
        }

        console.log(`User ${USERNAME} registered and logged in successfully`);

        sleep(1);
    })
}