# JSDoc for mongodb-sandbox

Launch a stand-alone MongoDB Topology for use within a Test Suite.


## Examples

`mongodb-sandbox` is Promise-based API.


Embed a [Lifecycle](#Lifecycle) into the [mocha](https://github.com/mochajs/mocha) Test Framework,
backed by a MongoDB 3.4.2 [Sandbox](#Sandbox).

> A variant of this Example, as well as examples for other Test Frameworks,
> can be found in the [README](./README.md#examples).

```javascript
const { createSandbox } = require('mongodb-sandbox');

const sandbox = createSandbox({
  version: '3.4.2',
});

before(function() {
  const lifecycle = sandbox.lifecycle(this);

  before(lifecycle.beforeAll);
  beforeEach(lifecycle.beforeEach);
  afterEach(lifecycle.afterEach);
  after(lifecycle.afterAll);
});
```


Programatically create, start and stop a MongoDB 3.6.8 [Sandbox](#Sandbox)

```javascript
const { createSandbox } = require('mongodb-sandbox');

const sandbox = createSandbox({
  version: '3.6.8',
});

sandbox.start()
.then(() => {
  // use it in some fashion

  // and when you're done,
  return sandbox.stop();
});
```


A script to install the latest version of MongoDB to back a [Sandbox](#Sandbox),
out-of-band from your Test Suite.

```javascript
#!/usr/bin/env node
const { installSandbox } = require('mongodb-sandbox');

installSandbox()
.then((sandbox) => {
  console.log('installed the latest version of MongoDB.');
});
```


## Options

Configuration properties are documented in [Sandbox.options](#Sandbox.options).

In addition to the properties a [Sandbox](#Sandbox) recognizes,
the you may provide any options passed to a `MongoDBDownload` instance
(from the [mongodb-download](https://github.com/winfinit/mongodb-download) module).

Several useful properties are:

- `version` - a specific MongoDB version, eg. '3.4.2';
  *default* = 'latest'
- `downloadDir` - the directory where the MongoDB binaries will be downloaded & installed.
  *default* = a cache local to the `mongodb-sandbox` module.


## Classes

<dl>
<dt><a href="#Lifecycle">Lifecycle</a></dt>
<dd><p>A simple encapsulation of methods for a Test Framework lifecycle.</p>
</dd>
<dt><a href="#Sandbox">Sandbox</a></dt>
<dd><p>A Sandbox that launches a stand-alone MongoDB Topology for use within a Test Suite.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#createSandbox">createSandbox()</a> ⇒ <code><a href="#Sandbox">Sandbox</a></code></dt>
<dd><p>A Factory method for a Sandbox.</p>
</dd>
<dt><a href="#installSandbox">installSandbox()</a> ⇒ <code><a href="#Sandbox">Promise.&lt;Sandbox&gt;</a></code></dt>
<dd><p>Installs MongoDB support for a Sandbox.</p>
</dd>
</dl>

<a name="Lifecycle"></a>

## Lifecycle
A simple encapsulation of methods for a Test Framework lifecycle.

**Kind**: global class  

* [Lifecycle](#Lifecycle)
    * [lifecycle.sandbox](#Lifecycle+sandbox)
    * [lifecycle.context](#Lifecycle+context)
    * [lifecycle.beforeAll()](#Lifecycle+beforeAll) ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
    * [lifecycle.beforeEach()](#Lifecycle+beforeEach) ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
    * [lifecycle.afterEach()](#Lifecycle+afterEach) ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
    * [lifecycle.afterAll()](#Lifecycle+afterAll) ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)

<a name="Lifecycle+sandbox"></a>

### lifecycle.sandbox
The Sandbox passed to the constructor.

**Kind**: instance property of [<code>Lifecycle</code>](#Lifecycle)  
**Properties**

-  [<code>Sandbox</code>](#Sandbox)  

<a name="Lifecycle+context"></a>

### lifecycle.context
The Test Framework context passed to the constructor.

**Kind**: instance property of [<code>Lifecycle</code>](#Lifecycle)  
**Properties**

-  <code>Object</code>  

<a name="Lifecycle+beforeAll"></a>

### lifecycle.beforeAll() ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
To be invoked at the **start** of the global Test Framework lifecycle.

**Kind**: instance method of [<code>Lifecycle</code>](#Lifecycle)  
**Returns**: [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle) - a Promise resolving `this`  
**Params**: <code>Object</code> [context] an instance of the Test Framework context  
<a name="Lifecycle+beforeEach"></a>

### lifecycle.beforeEach() ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
To be invoked at the **start** of each individual case in the Test Framework lifecycle.

**Kind**: instance method of [<code>Lifecycle</code>](#Lifecycle)  
**Returns**: [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle) - a Promise resolving `this`  
**Params**: <code>Object</code> [context] an instance of the Test Framework context  
<a name="Lifecycle+afterEach"></a>

### lifecycle.afterEach() ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
To be invoked at the **end** of each individual case in the Test Framework lifecycle.

**Kind**: instance method of [<code>Lifecycle</code>](#Lifecycle)  
**Returns**: [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle) - a Promise resolving `this`  
**Params**: <code>Object</code> [context] an instance of the Test Framework context  
<a name="Lifecycle+afterAll"></a>

### lifecycle.afterAll() ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
To be invoked at the **end** of the global Test Framework lifecycle.

**Kind**: instance method of [<code>Lifecycle</code>](#Lifecycle)  
**Returns**: [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle) - a Promise resolving `this`  
**Params**: <code>Object</code> [context] an instance of the Test Framework context  
<a name="Sandbox"></a>

## Sandbox
A Sandbox that launches a stand-alone MongoDB Topology for use within a Test Suite.

**Kind**: global class  

* [Sandbox](#Sandbox)
    * [sandbox.options](#Sandbox+options)
    * [sandbox.isRunning](#Sandbox+isRunning) : <code>Boolean</code>
    * [sandbox.config](#Sandbox+config) : [<code>config</code>](#Sandbox.config)
    * [sandbox.start()](#Sandbox+start) ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
    * [sandbox.stop()](#Sandbox+stop) ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
    * [sandbox.install()](#Sandbox+install) ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
    * [sandbox.hasDocuments()](#Sandbox+hasDocuments) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [sandbox.purgeDocuments()](#Sandbox+purgeDocuments) ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
    * [sandbox.lifecycle()](#Sandbox+lifecycle) ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
    * [sandbox.client()](#Sandbox+client) ⇒ <code>Promise.&lt;MongoClient&gt;</code>
    * [sandbox.newClient()](#Sandbox+newClient) ⇒ <code>Promise.&lt;MongoClient&gt;</code>
    * [Sandbox.options](#Sandbox.options) : <code>Object</code>
    * [Sandbox.config](#Sandbox.config) : <code>Object</code>

<a name="Sandbox+options"></a>

### sandbox.options
The configuration options passed to the constructor.

**Kind**: instance property of [<code>Sandbox</code>](#Sandbox)  
**Properties**

-  [<code>options</code>](#Sandbox.options)  

<a name="Sandbox+isRunning"></a>

### sandbox.isRunning : <code>Boolean</code>
`true` if the Sandbox is running.

**Kind**: instance property of [<code>Sandbox</code>](#Sandbox)  
<a name="Sandbox+config"></a>

### sandbox.config : [<code>config</code>](#Sandbox.config)
Configuration properties for connecting to the MongoDB Topology backing a running Sandbox.

**Kind**: instance property of [<code>Sandbox</code>](#Sandbox)  
**Throws**:

- <code>Error</code> if the Sandbox is not running.

<a name="Sandbox+start"></a>

### sandbox.start() ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox) - a Promise resolving `this`  
<a name="Sandbox+stop"></a>

### sandbox.stop() ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox) - a Promise resolving `this`  
<a name="Sandbox+install"></a>

### sandbox.install() ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
Install a version of MongoDB.

**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox) - a Promise resolving `this`  
**See**: [mongodb-download](https://github.com/winfinit/mongodb-download)  
<a name="Sandbox+hasDocuments"></a>

### sandbox.hasDocuments() ⇒ <code>Promise.&lt;Boolean&gt;</code>
**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - a Promise resolving `true`
  if the Sandbox contains any Documents.  
<a name="Sandbox+purgeDocuments"></a>

### sandbox.purgeDocuments() ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
Delete all Documents from the Sandbox.

**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox) - a Promise resolving `this`  
<a name="Sandbox+lifecycle"></a>

### sandbox.lifecycle() ⇒ [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle)
**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: [<code>Promise.&lt;Lifecycle&gt;</code>](#Lifecycle) - a Promise resolving
  a Lifecycle instance.  
**Params**: <code>Object</code> [context] an instance of the Test Framework context  
<a name="Sandbox+client"></a>

### sandbox.client() ⇒ <code>Promise.&lt;MongoClient&gt;</code>
**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: <code>Promise.&lt;MongoClient&gt;</code> - a Promise resolving
  a singleton MongoDB Client connected to the Sandbox.  
**See**: [newClient](#Sandbox+newClient)  
<a name="Sandbox+newClient"></a>

### sandbox.newClient() ⇒ <code>Promise.&lt;MongoClient&gt;</code>
The Connections backing all returned Clients will be closed automatically upon `#stop`.

**Kind**: instance method of [<code>Sandbox</code>](#Sandbox)  
**Returns**: <code>Promise.&lt;MongoClient&gt;</code> - a Promise resolving
  a MongoDB Client connected to the Sandbox.  
<a name="Sandbox.options"></a>

### Sandbox.options : <code>Object</code>
Options for constructing a Sandbox.

Beyond the properties called out below,
you may provide any options passed to a `MongoDBDownload` instance
from the [mongodb-download](https://github.com/winfinit/mongodb-download) module,
eg. `{ version, downloadDir }`, etc.

**Kind**: static typedef of [<code>Sandbox</code>](#Sandbox)  
**See**: [Options](https://github.com/cantremember/mongodb-sandbox/JSDOC.md#options)  
**Properties**

- host <code>String</code> - an alternate `bind_ip` for the `mongod` Daemon, eg. '0.0.0.0';
  *default* = 127.0.0.1  
- basePort <code>Number</code> - where to start looking for an available local port;
  *default* = 27017 (MongoDB standard)  
- database <code>String</code> - the Database name to use in the Test Suite;
  *default* = 'mongodb-sandbox'  
- minimumUptimeMs <code>Number</code> - the minimum amount of time that the Topology should be left running,
  in milliseconds;
  *default* = 0ms  

<a name="Sandbox.config"></a>

### Sandbox.config : <code>Object</code>
Configuration available from a running Sandbox.

`port` is not exposed at the top level;
rather, it is exposed from the `mongod` option entries within `daemons`.

**Kind**: static typedef of [<code>Sandbox</code>](#Sandbox)  
**Properties**

- url <code>String</code> - a MongoDB connection URL for the MongoDB Topology  
- host <code>String</code> - the host where the Sandbox is listening  
- database <code>String</code> - the name of the Sandbox database to be used for testing  
- downloadDir <code>String</code> - the directory where the MongoDB binaries have been installed  
- daemons <code>Array.&lt;Object&gt;</code> - an Array of `mongod` daemon options,
  one for each MongoDB Server which backs the Sandbox,
  providing (at least) `{ bind_ip, port, dbpath, url }`  

<a name="createSandbox"></a>

## createSandbox() ⇒ [<code>Sandbox</code>](#Sandbox)
A Factory method for a Sandbox.

**Kind**: global function  
**Returns**: [<code>Sandbox</code>](#Sandbox) - a MongoDB Sandbox instance  
**Params**: [<code>options</code>](#Sandbox.options) [options] Sandbox configuration options  
<a name="installSandbox"></a>

## installSandbox() ⇒ [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox)
Installs MongoDB support for a Sandbox.

**Kind**: global function  
**Returns**: [<code>Promise.&lt;Sandbox&gt;</code>](#Sandbox) - a Promise resolving
  a Sandbox instance which has been installed.  
**Params**: [<code>options</code>](#Sandbox.options) [options] Sandbox configuration options  
