/*
* 京东到家农场
* 需要先手动进系统种一棵果树
* */
const $ = new Env('京东到家农场');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let cookiesArr = [];
$.modelId = 'M10007';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  });
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [
    $.getdata("CookieJD"),
    $.getdata("CookieJD2"),
    ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie)].filter((item) => !!item);
}
!(async () => {
  for (let i = 0; i < cookiesArr.length; i++) {
    $.index = i + 1;
    $.cookie = cookiesArr[i];
    $.isLogin = true;
    $.nickName = '';
    await TotalBean();
    $.UserName = decodeURIComponent($.cookie.match(/pt_pin=([^; ]+)(?=;?)/) && $.cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
    console.log(`\n*****开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
    if (!$.isLogin) {
      $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

      if ($.isNode()) {
        await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
      }
      continue
    }
    await main();
  }
})().catch((e) => {$.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')}).finally(() => {$.done();});

async function main() {
  $.lat = '30.' + Math.round(Math.random() * (99999 - 10000) + 10000);
  $.lng = '114.' + Math.round(Math.random() * (99999 - 10000) + 10000);
  $.cityid = 2;
  $.o2o_m_h5_sid = '';
  $.deviceid_pdj_jd = '';
  await getJDDJCk();
  if(!$.o2o_m_h5_sid || !$.deviceid_pdj_jd){
    console.log(`${$.UserName}获取京东到家CK失败`);
    return;
  }
  $.token = $.deviceid_pdj_jd;
  $.jddjCookie = `deviceid_pdj_jd=${$.deviceid_pdj_jd};PDJ_H5_PIN=${$.cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]};o2o_m_h5_sid=${$.o2o_m_h5_sid};`
  console.log($.jddjCookie )
  await $.wait(1000);
  $.treeInfo = {};
  await takePostRequest('initFruit');
  if(JSON.stringify($.treeInfo) === '{}'){
    console.log(`获取详情失败,可能还未种果树`);
    return ;
  }else{
    $.userPin = $.treeInfo.activityInfoResponse.userPin;
    $.waterBalance =$.treeInfo .userResponse.waterBalance;
    console.log(`获取果树详情成功，当前有${$.waterBalance}滴水`);
  }
  if ($.treeInfo.activityInfoResponse.curStageLeftProcess === 0) {
    console.log(`已经成熟`);
    return;
  }
  $.waterWheelInfo = {}
  await takeGetRequest('getWaterWheelInfo');
  if(Number($.waterWheelInfo['waterStorage']) > 10){
    console.log(`收集风车水滴，现有${$.waterWheelInfo['waterStorage']}滴`);
    await $.wait(1000);
    await takeGetRequest('collectWater');
  }else{
    console.log(`水车当前水滴为：${$.waterWheelInfo['waterStorage']},大于10时会收取`);
  }
  await $.wait(2000);
  $.waterBottleInfo = {};
  await takeGetRequest('getWaterBottleInfo');
  if($.waterBottleInfo.receiveStatus === 0){
    await $.wait(1000);
    console.log(`收水瓶中的水，当前有${$.waterBottleInfo.yesterdayAccumulate}滴水`);
    await takeGetRequest('receiveWaterBottle');
  }else if ($.waterBottleInfo.receiveStatus === 1) {
    console.log(`水瓶水滴已收过`)
  } else if ($.waterBottleInfo.receiveStatus === -2) {
    console.log(`未到收取水瓶水滴时间`)
  }
  await $.wait(2000);
  $.taskInfoList = [];
  await takeGetRequest('list');//任务列表
  await doTask();
  await $.wait(2000);
  await takePostRequest('initFruit');
  $.waterBalance =$.treeInfo .userResponse.waterBalance;
  let all = Math.floor($.waterBalance/10);
  console.log(`现有${$.waterBalance}滴水，可以浇${all}次`)
  for (let i = 0; i < all; i++) {
    console.log(`第${i}次浇水`)
    await takePostRequest('watering');
    await $.wait(2000);
  }
}

async function doTask() {
  for (let i = 0; i < $.taskInfoList.length; i++) {
    $.oneTask = $.taskInfoList[i];
    if ($.oneTask.status === 3 || $.oneTask.status === 2) {
      console.log(`任务：${$.oneTask.taskTitle},已完成`)
    } else if ($.oneTask.taskId === '23dec596e901e11' && $.oneTask.status === 0) {
      console.log(`执行任务:${$.oneTask.taskTitle}`)
      await takeGetRequest('userSigninNew');
      await $.wait(2000);
    } else if ([307, 901, 1102, 1105, 1103, 0, 1101].includes($.oneTask.taskType)){
      if ($.oneTask.status === 0) {
        await takeGetRequest('received');
        if(Number($.oneTask.browseTime)>0){
          console.log(`执行任务：${$.oneTask.taskTitle},等待${$.oneTask.browseTime}秒`);
          await $.wait(Number(1000*$.oneTask.browseTime))
        }else{
          console.log(`执行任务：${$.oneTask.taskTitle}`);
          await $.wait(Number(3000));
        }
      }else{
        await takeGetRequest('finished');
        console.log(`完成任务:${$.oneTask.taskTitle}`);
        await $.wait(Number(3000));
      }
    }
    if ($.oneTask.status === 2 || $.oneTask.taskTypes === 1102) {
      console.log(`领取奖励:${$.oneTask.taskTitle}`);
      await takeGetRequest('sendPrize');
      await $.wait(Number(3000));
    } else if ($.oneTask.status == 3) {
      console.log(`任务:${$.oneTask.taskTitle}，奖励已领取`);
    }
  }
}


function dealReturn(type,data) {
  try {
    data = JSON.parse(data);
  }catch (e) {
    console.log(data);
  }
  switch (type) {
    case 'initFruit':
      if(data.code === '0'){
        $.treeInfo = data.result;
      }
      break;
    case 'getWaterWheelInfo':
      if(data['code'] === '0'  && data['result']){
        $.waterWheelInfo = data['result'];
        console.log('获取水车信息成功')
      }
      break;
    case 'getWaterBottleInfo':
      if(data['code'] === '0'  && data['result']){
        $.waterBottleInfo = data['result'];
        console.log('获取水瓶信息成功')
      }
      break;
    case 'collectWater':
      if (data.code === '0') {
        console.log('收取水车水滴成功')
      } else {
        console.log('收取水车水滴失败')
      }
      break;
    case 'receiveWaterBottle':
      if (data.code === '0') {
        console.log('收取水瓶水滴成功')
      } else {
        console.log('收取水瓶水滴失败')
      }
    case 'list':
      if(data['code'] === '0'  && data['result'] && data['result']['taskInfoList']){
        $.taskInfoList = data['result']['taskInfoList'];
      }
      break;
    case 'userSigninNew':
      if(data['code'] === '0'){
        console.log('签到成功');
      }else{
        console.log(JSON.stringify(data));
        console.log('签到失败');
      }
      break;
    case 'received':
      break;
    case 'finished':
      break;
    case 'sendPrize':
      if($.oneTask.taskTypes === 1102){
        console.log(JSON.stringify(data));
      }
      break;
    case 'watering':
      console.log(JSON.stringify(data));
      break;
    default:
      console.log(JSON.stringify(data));
  }
}

async function takeGetRequest(type) {
  let body = ``;
  let functionId = ``;
  let myRequest = ``;
  switch (type) {
    case 'list':
      body = `{"modelId":"${$.modelId}","plateCode":1}`;
      functionId = `task/list`;
      break;
    case 'getWaterWheelInfo':
      body = `{}`;
      functionId = `fruit/getWaterWheelInfo`;
      break;
    case 'collectWater':
      body = `{}`;
      functionId = `fruit/collectWater`;
      break;
    case 'getWaterBottleInfo':
      body = `{}`;
      functionId = `fruit/getWaterBottleInfo`;
      break;
    case 'receiveWaterBottle':
      body = `{}`;
      functionId = `fruit/receiveWaterBottle`;
      break;
    case 'userSigninNew':
      body = `{"channel":"daojiaguoyuan"}`;
      functionId = `signin/userSigninNew`;
      break;
    case 'received':
      body = `{"modelId":"${$.modelId}","taskId":"${$.oneTask.taskId}","taskType":${$.oneTask.taskType},"plateCode":1}`;
      functionId = `task/received`;
      break;
    case 'finished':
      body = `{"modelId":"${$.modelId}","taskId":"${$.oneTask.taskId}","taskType":${$.oneTask.taskType},"plateCode":1}`;
      functionId = `task/finished`;
      break;
    case 'sendPrize':
      body = `{"modelId":"${$.modelId}","taskId":"${$.oneTask.taskId}","taskType":${$.oneTask.taskType},"plateCode":1,"subNode":null}`;
      functionId = `task/sendPrize`;
      break;
    default:
      console.log(`错误${type}`);
  }
  myRequest =  await getMyRequestGet(body,functionId);
  return new Promise(async resolve => {
    $.get(myRequest, (err, resp, data) => {
      try {
        dealReturn(type, data);
      } catch (e) {console.log(data);$.logErr(e, resp)} finally {resolve();}
    });
  })
}

async function takePostRequest(type) {
  let url = ``;
  let myRequest = ``;
  let body = ``;
  switch (type) {
    case 'initFruit':
      url = `https://daojia.jd.com:443/client?_jdrandom=${Date.now()}&functionId=fruit%2FinitFruit`;
      body = `body=%7B%22cityId%22%3A${$.cityid}%2C%22longitude%22%3A${$.lng}%2C%22latitude%22%3A${$.lat}%7D&lat=${$.lat}&lng=${$.lng}&lat_pos=${$.lat}&lng_pos=${$.lng}&city_id=${$.cityid}&channel=ios&platform=6.6.0&platCode=h5&appVersion=6.6.0&appName=paidaojia&deviceModel=appmodel&traceId=${$.token}${Date.now()}&deviceToken=${$.token}&deviceId=${$.token}`;
      myRequest = getPostRequest(url, body);
      break;
    case 'watering':
      let bodyInfo = `{"waterTime":1}`;
      let functionId = `fruit/watering`
      url = `https://daojia.jd.com/client?_jdrandom=${Date.now()}`;
      body = `functionId=${encodeURI(functionId)}&isNeedDealError=true&method=POST&body=${encodeURI(bodyInfo)}&lat=${$.lat}&lng=${$.lng}&lat_pos=${$.lat}&lng_pos=${$.lng}&city_id=${$.cityId}&channel=ios&platform=6.6.0&platCode=h5&appVersion=6.6.0&appName=paidaojia&deviceModel=appmodel&traceId=${$.token}${Date.now()}&deviceToken=${$.token}&deviceId=${$.token}`;
      myRequest = getPostRequest(url, body);
      break;
    default:
      console.log(`错误${type}`);
  }
  return new Promise(async resolve => {
    $.post(myRequest, (err, resp, data) => {
      try {
        dealReturn(type, data);
      } catch (e) {console.log(data);$.logErr(e, resp)} finally {resolve();}
    });
  })
}

function getPostRequest(url, body){
  let headers = {
    'Host': 'daojia.jd.com',
    'Content-Type': 'application/x-www-form-urlencoded;',
    'Origin': 'https://daojia.jd.com',
    'Cookie': $.jddjCookie,
    'Connection': 'keep-alive',
    'Accept': '*/*',
    "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
    'Accept-Language': 'zh-cn'
  };
  return {url: url, method: 'POST', headers: headers,body:body};
}
async function getMyRequestGet(body,functionId){
  let url = `https://daojia.jd.com/client?_jdrandom=${Date.now()}&functionId=${encodeURI(functionId)}&isNeedDealError=true&body=${encodeURI(body)}&lat=${$.lat}&lng=${$.lng}&lat_pos=${$.lat}&lng_pos=${$.lng}&city_id=${$.cityId}&channel=ios&platform=6.6.0&platCode=h5&appVersion=6.6.0&appName=paidaojia&deviceModel=appmodel&traceId=${$.token}${Date.now()}&deviceToken=${$.token}&deviceId=${$.token}`;
  const method = `GET`;
  const headers = {
    'Host': 'daojia.jd.com',
    'Content-Type': 'application/x-www-form-urlencoded;',
    'Origin': 'https://daojia.jd.com',
    'Cookie': $.jddjCookie,
    'Connection': 'keep-alive',
    'Accept': '*/*',
    "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
    'Accept-Language': 'zh-cn'
  };
  return  {url: url,method: method,headers: headers} ;
}

async function getJDDJCk() {
  let myRequest =  {
    url: `https://daojia.jd.com/client?_jdrandom=${Date.now()}&platCode=H5&appName=paidaojia&channel=jdapp&appVersion=8.9.5&jdDevice=&functionId=login/treasure&body={%22refPageSource%22:%22%22,%22longitude%22:null,%22latitude%22:null,%22pageSource%22:%22home%22,%22ref%22:%22%22,%22ctp%22:%22home%22}`,
    method: 'GET',
    headers: {
      'Authority': 'daojia.jd.com',
      'Accept-Encoding': `gzip, deflate, br`,
      'Accept-Language': `zh-CN,zh;q=0.9`,
      'Cookie': `${$.cookie}`,
      "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
      'Accept': `application/json, text/plain, */*`,
    }
  };
  return new Promise(async resolve => {
    $.get(myRequest, (err, resp, data) => {
      try {
        let setCookieList = resp['headers']['set-cookie'];
        for (let i = 0; i < setCookieList.length; i++) {
          if(setCookieList[i].match(/o2o_m_h5_sid=(.*); Version=/) && setCookieList[i].match(/o2o_m_h5_sid=(.*); Version=/)[1]){
            $.o2o_m_h5_sid = setCookieList[i].match(/o2o_m_h5_sid=(.*); Version=/)[1]
          }
          if(setCookieList[i].match(/deviceid_pdj_jd=(.*); Version=/) && setCookieList[i].match(/deviceid_pdj_jd=(.*); Version=/)[1]){
            $.deviceid_pdj_jd = setCookieList[i].match(/deviceid_pdj_jd=(.*); Version=/)[1]
          }
        }
      } catch (e) {
        console.log(data);
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function TotalBean() {return new Promise(async resolve => {const options = {"url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,"headers": {"Accept": "application/json,text/plain, */*","Content-Type": "application/x-www-form-urlencoded","Accept-Encoding": "gzip, deflate, br","Accept-Language": "zh-cn","Connection": "keep-alive","Cookie": $.cookie,"Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2","User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")}};$.post(options, (err, resp, data) => {try {if (err) {console.log(`${JSON.stringify(err)}`);            console.log(`${$.name} API请求失败，请检查网路重试`);} else {if (data) {data = JSON.parse(data);if (data['retcode'] === 13) {$.isLogin = false; return;}if (data['retcode'] === 0) {$.nickName = (data['base'] && data['base'].nickname) || $.UserName;} else {$.nickName = $.UserName;}} else {console.log(`京东服务器返回空数据`);}}} catch (e) {  $.logErr(e, resp);} finally {  resolve();}});});}
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}



