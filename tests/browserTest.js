import { check } from 'k6';
import http from 'k6/http';
import {browser} from 'k6/browser';

export const options = {
    // 4 or 5 - put load on URL get call - 100 users, [url browses]

    scenarios : {

        ui:{
                // browser testing
                exec: 'browserTest',
                executor: 'shared-iterations',
                vus:2,
                maxDuration:'1m',
                iterations :4,
                options:{
                    browser:{
                        type:'chromium',
                        headless:"false"
                    }
                }
        },

        backEndStress :{
                executor:'constant-vus',   //They can run n number of iterations
                exec: 'backEndStress',
                vus: 10,
                duration: '1m'

        }
    },
    thresholds:{

        checks: ['rate>0.90'],
        //Core Web Vitals
        'browser_web_vital_cls':['p(95)<2500'],         //Layout Stability  - Cumulative Layout Shift
        'browser_web_vital_fcp':['p(95)<2000'],         //Fist content      - First Content Paintful
        'browser_web_vital_lcp':['p(95)<2500'],         //Main Content      - Largest Content Paintful
        'browser_web_vital_fid':['p(95)<100'],          //Interactivity     - First Input Delay
        'browser_web_vital_ttfb':['p(95)<600'],         //Server response   - Time to First Byte

        //Additnonal mertics
        'browser_web_vital_inp':['p(95)<200'],          //Input responsiveness  - Interation to NextPaint
        
    }

}


export async function browserTest() {

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://rahulshettyacademy.com/locatorspractice/');
    await page.locator('#inputUsername').fill('rahulshettyacademy');
    await page.locator('input[name="inputPassword"]').fill('learning');
    await page.locator('#chkboxOne').check();
    await page.locator('#chkboxTwo').check();
    await page.locator('.submit').click();

    await page.waitForTimeout(2000);

    const headerText  = await page.locator("h1").first().textContent();

    check(headerText,{

        header : (text)=>
        {
            return text.includes('Rahul Shetty Academy');
            console.log(text);
        }
    })

    await page.close();

}

export async function backEndStress() {

    const res = http.get('https://rahulshettyacademy.com/locatorspractice/');
    check(res,{
        'Status code is 200': (r)  => r.status === 200
    })
}