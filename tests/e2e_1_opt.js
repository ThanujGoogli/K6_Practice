import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate } from 'k6/metrics';
import { Counter } from 'k6/metrics';

const BASE_URL = 'https://quickpizza.grafana.com';

const authenticationRate = new Rate('authentication_rate'); //1 0 1 0 0 
const successfulOrders = new Counter('successful_orders');

const configsObj = JSON.parse(open('./test-config.json'));
const userTemplate = JSON.parse(open('./user.json'));
const PASSWORD = userTemplate.password;

function getTestConfig(){

    const testType = __ENV.TEST_TYPE || 'smoke';
    const config = configsObj[testType];
    return config;
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}
const selectedConfig = getTestConfig();

//load,spike,soak,stress
export const options = {
    stages: selectedConfig.stages,
    thresholds: selectedConfig.thresholds,
    cloud: {

        //Project defalut project
        projectID: 8503644,
        distribution: {
            'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
        },
        name: 'Test E2E Framework'
    },
}

export function setup(){

    const apiCheck = http.get(`${BASE_URL}/`);
    if(apiCheck === 0){
        console.log("API is unreachable")
        throw new Error("API end point is not available");
    }
}

export default function () {

    let userRegistered = false;
    let USERNAME = `Tester${generateRandomString(10)}1`;
    let authToken = null;
    let userAuthenticated = false;
    let orderCreated = false;
    let orderID = null;
    let pizzaName = null;

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
            authenticationRate.add(0);
            console.error(
                `Login failed: ${loginResponse.status} - ${loginResponse.body}`
            );
            return;
        }
        if (loginSuccessful) {
            authenticationRate.add(1);
            authToken = loginResponse.json('token');
            console.log(`User ${USERNAME} registered and logged in successfully`);
        }

        sleep(1);
    })

    group('Order Management', function () {

        const params = {
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            }
        }

        const orderPayload = {

            "maxCaloriesPerSlice": 1000,
            "mustBeVegetarian": false,
            "excludedIngredients": [],
            "excludedTools": [],
            "maxNumberOfToppings": 5,
            "minNumberOfToppings": 2,
            "customName": "hello"

        };

        const createOrderResponse = http.post(`${BASE_URL}/api/pizza`, JSON.stringify(orderPayload), params);

        orderCreated = check(createOrderResponse, {
            'Order created status in 200': (r) => r.status === 200 || r.status === 201,
            'Order contains id': (r) => !!r.json('pizza.id'),
            'Order name matches': (r) => r.json('pizza.name') === orderPayload.customName

        });

        if (orderCreated) {
            successfulOrders.add(1);
            orderID = createOrderResponse.json('pizza.id');
            console.log(`Order created successfully with ID: ${orderID}`);
            // pizzaName = createOrderResponse.json('pizza.name');
            // console.log(`Pizza name: ${pizzaName}`);

        }
        else {
            successfulOrders.add(0);
            console.error(`Order creation failed with status code: ${createOrderResponse.status} - ${createOrderResponse.body}`);
            return;
        }
        sleep(1);

        //Retrieve the order details
        const getOrderResponse = http.get(`${BASE_URL}/api/pizza/${orderID}`, params);

        orderCreated = check(getOrderResponse, {
            'Order retrieval status in 200': (r) => r.status === 200,
            'Order ID matches': (r) => r.json('id') === orderID,
            'Order name matches': (r) => r.json('name') === orderPayload.customName
        });

        if (orderCreated) {
            successfulOrders.add(1);
            console.log(`Order retrieved successfully with ID: ${orderID}`);
        }
        else {
            successfulOrders.add(0);
            console.error(`Order retrieval failed with status code: ${getOrderResponse.status} - ${getOrderResponse.body}`);
            return;
        }
    })


}
