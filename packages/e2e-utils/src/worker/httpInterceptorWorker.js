this.importScripts(
  'https://unpkg.com/@endpass/e2e-utils@<%= PACKAGE_VERSION %>/SWMessagesMethods.js',
);
this.importScripts(
  'https://unpkg.com/@endpass/e2e-utils@<%= PACKAGE_VERSION %>/SWUtils.js',
);

this.importScripts('https://unpkg.com/dexie@2.0.4/dist/dexie.min.js');
this.importScripts('https://unpkg.com/serviceworkers-ware@0.3.2/dist/sww.js');

/**
 * DB initialization
 */
const db = new this.Dexie('routes_mocks_db');

try {
  db.version(2).stores({
    static: '++index,id,url,method,status,headers',
    once: '++index,id,url,method,status,headers',
  });
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(e);
}

const createEntity = route =>
  Object.assign({}, route, {
    wildCardUrl: this.SWUtils.createWildCardUrl(route.url),
  });

const wrapRoutesDBTable = table => ({
  add: route => db[table].add(createEntity(route)),

  put: async (filter, route) => {
    const entity = createEntity(route);
    const field = await db[table].where(filter).first();
    if (field) {
      return db[table].where(filter).modify(entity);
    }
    return db[table].add(entity);
  },

  remove: filter => db[table].where(filter).delete(),

  find: async ({ url, method }) => {
    const val = await db[table]
      .where({ method })
      .filter(route => {
        const res =
          url === route.url ||
          (route.wildCardUrl && url.search(route.wildCardUrl) === 0);
        return res;
      })
      .first();

    return val;
  },
  clear: () => db[table].clear(),
});
const staticRouteTable = wrapRoutesDBTable('static');
const onceRouteTable = wrapRoutesDBTable('once');

/**
 * Worker preparings
 */
const worker = new this.ServiceWorkerWare();

const createResponse = mockData => {
  const isString = typeof mockData.response === 'string';

  if (isString) {
    return new Response(mockData.response, {
      status: mockData.status,
      headers: {
        'Content-Type': 'text/plain',
        ...mockData.headers,
      },
    });
  }

  return new Response(JSON.stringify(mockData.response), {
    status: mockData.status,
    headers: {
      'Content-Type': 'application/json',
      ...mockData.headers,
    },
  });
};

const handleIncomingWorkerMessage = async ev => {
  const { SWMessagesMethods } = this;
  const { data = {} } = ev;
  const { method, msgType, msgId } = data;
  const { mock } = data;

  if (msgType !== SWMessagesMethods.MSG_TYPE_REQUEST) {
    return;
  }

  switch (method) {
    case SWMessagesMethods.MOCK_ONCE:
      await onceRouteTable.add(data.mock);
      break;
    case SWMessagesMethods.MOCK:
      // find same, update if exist or save
      await staticRouteTable.put(
        {
          url: mock.url,
          method: mock.method,
          status: mock.status,
        },
        mock,
      );
      break;
    case SWMessagesMethods.CLEAR_ALL_MOCKS:
      await staticRouteTable.clear();
      await onceRouteTable.clear();
      break;
    default:
      break;
  }

  const sendData = {
    msgId,
    msgType: SWMessagesMethods.MSG_TYPE_ANSWER,
    method: data.method,
  };

  // eslint-disable-next-line no-restricted-globals
  self.clients.matchAll().then(all =>
    all.map(client => {
      client.postMessage(sendData);
      return client;
    }),
  );
};

const fetchMiddleware = async (req, res, endWith) => {
  const onceRouteMock = await onceRouteTable.find(req);

  if (onceRouteMock) {
    await onceRouteTable.remove({ id: onceRouteMock.id });

    return endWith(createResponse(onceRouteMock));
  }

  const staticRouteMock = await staticRouteTable.find(req);

  if (staticRouteMock) {
    return endWith(createResponse(staticRouteMock));
  }

  return [req, res];
};

/**
 * Worker initialization
 */
this.addEventListener('message', handleIncomingWorkerMessage);
worker.use(fetchMiddleware);
worker.init();
