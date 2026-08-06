
const { calculateAuthorizationHeader } = require('./veracode-hmac.js');
const { getHostAndCredentials } = require('../utils.js')
const core = require('@actions/core');
const { setGlobalDispatcher,ProxyAgent, fetch } = require('undici')


function getProxy(isDebug) {
  core.debug('--  getProxy() - START  --');
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  const proxyUser = process.env.PROXY_USER;
  const proxyPass = process.env.PROXY_PASS;
  const proxyProtocol = process.env.PROXY_PROTOCOL || 'http';

  if (httpProxy || httpsProxy || (proxyHost && proxyPort)) {
    let uri = httpsProxy || httpProxy || `${proxyProtocol}://${proxyHost}:${proxyPort}`;
    let proxyAttr = {uri};

    if (proxyUser && proxyPass) {
      if (isDebug) {
        core.info('found user and password - setting up \'token\' attribute in the proxy settings');
      }
      proxyAttr['token'] = `Basic ${Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64')}`
    }
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- getProxy ----')
      core.info('---- proxyAttr: ' + JSON.stringify(proxyAttr,null,2))
      core.info('---- http_proxy: ' + httpProxy)
      core.info('---- https_proxy: ' + httpsProxy)
      core.info('---- proxy user: ' + proxyUser)
      core.info('---- proxy pass provided: ' + (proxyPass && proxyPass.length>0))      
      core.info('---- DEBUG OUTPUT END ----')  
    }
    const proxyAgent = new ProxyAgent(proxyAttr);
    core.debug(`---- Global Proxy Set to: ${uri} ---`);
    core.debug('--  getProxy() - END  --');
    return proxyAgent;
  } else {
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- getProxy ----')
      core.info('---- NO Proxy host or port provided -> No proxy will be used for API calls  ----')
      core.info('---- DEBUG OUTPUT END ----')  
    }
  }
  core.debug('--  getProxy() - END  --');
  return null;
}

function setGlobalProxy(isDebug) {
  core.debug('--  setGlobalProxy() - START  --');
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  const proxyUser = process.env.PROXY_USER;
  const proxyPass = process.env.PROXY_PASS;
  const proxyProtocol = process.env.PROXY_PROTOCOAL || 'http';

  if (httpProxy || httpsProxy || (proxyHost && proxyPort)) {
    let uri = httpsProxy || httpProxy || `${proxyProtocol}://${proxyHost}:${proxyPort}`;
    let proxyAttr = {uri};

    if (proxyUser && proxyPass) {
      proxyAttr['token'] = `Basic ${Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64')}`
    }
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- setGlobalProxy ----')
      core.info('---- proxyAttr: ' + JSON.stringify(proxyAttr,null,2))
      core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
      core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
      core.info('---- proxy user: ' + proxyUser)
      core.info('---- proxy pass provided: ' + (proxyPass && proxyPass.length>0))      
      core.info('---- DEBUG OUTPUT END ----')  
    }
    const proxyAgent = new ProxyAgent(proxyAttr);
    setGlobalDispatcher(proxyAgent);
    core.debug(`---- Global Proxy Set to: ${uri} ---`);
  } else {
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- setGlobalProxy ----')
      core.info('---- NO Proxy host or port provided -> No proxy will be used for API calls ----')
      core.info('---- DEBUG OUTPUT END ----')  
    }
  }
  core.debug('--  setGlobalProxy() - END  --');
}

async function getResourceByAttribute (vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute;
  const queryValue = resource.queryValue;
  const queryAttribute2 = resource.queryAttribute2;
  const queryValue2 = resource.queryValue2;
  var urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  if ( queryAttribute2 ){
    urlQueryParams = urlQueryParams+`&${queryAttribute2}=${queryValue2}`;
  }


  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, 
      urlQueryParams, 'GET')
  };


  const appUrl = `https://${host}${resourceUri}${urlQueryParams}`;

  if (isDebug) {
    core.info('---- DEBUG OUTPUT START ----')
    core.info('---- getResourceByAttribute - request settings ----')
    core.info('---- req url: ' + appUrl)
    core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
    core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
    core.info('---- headers: ' + JSON.stringify(headers))
    core.info('---- DEBUG OUTPUT END ----')  
  }

  // Get Proxy
  //let proxy = getProxy(isDebug);
  //core.info(proxy);
  try {
    const fetchOptions = { headers };
    //   headers,
    //   ...(proxy && {dispatcher:proxy}) // We use global proxy setting
    // };
    core.info(fetchOptions);
    // Make the request
    const response = await fetch(appUrl,fetchOptions);
    const data = await response.json();

    if (isDebug) {
        core.info('---- DEBUG OUTPUT START ----');
        core.info('---- getResourceByAttribute - post resource response ----');
        core.info('---- Response Status: ' + response.status);
        core.info('---- Response Status Text: ' + response.statusText);
        core.info('---- Response URL: ' + response.url);
        core.info('---- Response OK: ' + response.ok);
        core.info('---- Response Type: ' + response.type);
        core.info('---- Response Data:');
        try {
          core.info(JSON.stringify(data,null,2));
        } catch (stringifyError) {
          core.into('---- Response data is not JSON');
          core.info(data);
        }
        core.info('---- DEBUG OUTPUT END ----')
    }

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }

    return data;
  } catch (error) {
    core.info('--- Cought error in getResourceByAttribute ---');
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  } 
}

async function getResource (vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, '', 'GET')
  };
  const appUrl = `https://${host}${resourceUri}`;
  // Get Proxy
  //let proxy = getProxy(isDebug);

  if (isDebug) {
    core.info('---- DEBUG OUTPUT START ----')
    core.info('---- getResource - request settings ----')
    core.info('---- req url: ' + appUrl)
    core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
    core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
    core.info('---- headers: ' + JSON.stringify(headers))
    core.info('---- DEBUG OUTPUT END ----')  
  }

  try {

    const response = await fetch(appUrl,{ headers });
    //   headers,
    //   ...(proxy && {dispatcher:proxy})
    // });

    const data = await response.json();

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
    // return the data
    return data;

  } catch (error) {
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  }
}

async function createResource(vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const resourceData = resource.resourceData;
  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, '', 'POST'),
    "Content-Type": "application/json"
  };

  // Get Proxy
  //let proxy = getProxy(isDebug);

  const appUrl = `https://${host}${resourceUri}`;
  try {

    const response = await fetch(appUrl,{ 
      method: 'POST',
      headers: headers,
      body: JSON.stringify(resourceData) //,
//      ...(proxy && {dispatcher:proxy})
      });

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
    return data = await response.json();

  } catch (error) {
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  }
}

module.exports = {
  getResourceByAttribute,
  getResource,
  createResource,
  setGlobalProxy
};