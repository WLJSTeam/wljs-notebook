import { _ as __name, l as log } from './mermaid.core-ad8d5d2d.js';
import { i as isUndefined, G as Graph } from './graph-bc133f60.js';
import { b as baseClone, m as map } from './map-1b52cc59.js';

/** Used to compose bitmasks for cloning. */
var CLONE_SYMBOLS_FLAG = 4;

/**
 * Creates a shallow clone of `value`.
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
 * and supports cloning arrays, array buffers, booleans, date objects, maps,
 * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
 * arrays. The own enumerable properties of `arguments` objects are cloned
 * as plain objects. An empty object is returned for uncloneable values such
 * as error objects, functions, DOM nodes, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to clone.
 * @returns {*} Returns the cloned value.
 * @see _.cloneDeep
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var shallow = _.clone(objects);
 * console.log(shallow[0] === objects[0]);
 * // => true
 */
function clone(value) {
  return baseClone(value, CLONE_SYMBOLS_FLAG);
}

/**
 * @template [GraphLabel=any] - Label of the graph.
 * @template [NodeLabel=any] - Label of a node.
 * @template [EdgeLabel=any] - Label of an edge.
 *
 * @typedef {object} GraphJSON
 * @property {Required<GraphOptions>} options - The options used to create the graph.
 * @property {Array<{ v: NodeID; value?: NodeLabel; parent?: NodeID }>} nodes - The nodes in the graph.
 * @property {Array<EdgeObj & { value?: EdgeLabel }>} edges - The edges in the graph.
 * @property {GraphLabel} [value] - The graph's value, if any.
 */

/**
 * Creates a JSON representation of the graph that can be serialized to a
 * string with
 * [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).
 * The graph can later be restored using {@link read}.
 *
 * @example
 *
 * ```js
 * var g = new graphlib.Graph();
 * g.setNode("a", { label: "node a" });
 * g.setNode("b", { label: "node b" });
 * g.setEdge("a", "b", { label: "edge a->b" });
 * graphlib.json.write(g);
 * // Returns the object:
 * //
 * // {
 * //   "options": {
 * //     "directed": true,
 * //     "multigraph": false,
 * //     "compound": false
 * //   },
 * //   "nodes": [
 * //     { "v": "a", "value": { "label": "node a" } },
 * //     { "v": "b", "value": { "label": "node b" } }
 * //   ],
 * //   "edges": [
 * //     { "v": "a", "w": "b", "value": { "label": "edge a->b" } }
 * //   ]
 * // }
 * ```
 *
 * @template [GraphLabel=any] - Label of the graph.
 * @template [NodeLabel=any] - Label of a node.
 * @template [EdgeLabel=any] - Label of an edge.
 * @param {Graph<GraphLabel, NodeLabel, EdgeLabel>} g - The graph to serialize.
 * @returns {GraphJSON<GraphLabel, NodeLabel, EdgeLabel>} The JSON representation of the graph.
 */
function write(g) {
  /** @type {GraphJSON<GraphLabel, NodeLabel, EdgeLabel>} */
  var json = {
    options: {
      directed: g.isDirected(),
      multigraph: g.isMultigraph(),
      compound: g.isCompound(),
    },
    nodes: writeNodes(g),
    edges: writeEdges(g),
  };
  if (!isUndefined(g.graph())) {
    json.value = clone(g.graph());
  }
  return json;
}

/**
 * @template NodeLabel - Label of a node.
 *
 * @param {Graph<unknown, NodeLabel, unknown>} g - The graph to serialize.
 * @returns {Array<{ v: NodeID; value?: NodeLabel; parent?: NodeID }>} The nodes in the graph.
 */
function writeNodes(g) {
  return map(g.nodes(), function (v) {
    var nodeValue = g.node(v);
    var parent = g.parent(v);
    /** @type {{ v: NodeID; value?: NodeLabel; parent?: NodeID }} */
    var node = { v: v };
    if (!isUndefined(nodeValue)) {
      node.value = nodeValue;
    }
    if (!isUndefined(parent)) {
      node.parent = parent;
    }
    return node;
  });
}

/**
 * @template EdgeLabel - Label of a node.
 *
 * @param {Graph<unknown, unknown, EdgeLabel>} g - The graph to serialize.
 * @returns {Array<EdgeObj & { value?: EdgeLabel }>} The edges in the graph.
 */
function writeEdges(g) {
  return map(g.edges(), function (e) {
    var edgeValue = g.edge(e);
    /** @type {EdgeObj & { value?: EdgeLabel }} */
    var edge = { v: e.v, w: e.w };
    if (!isUndefined(e.name)) {
      edge.name = e.name;
    }
    if (!isUndefined(edgeValue)) {
      edge.value = edgeValue;
    }
    return edge;
  });
}

var clusterDb = /* @__PURE__ */ new Map();
var descendants = /* @__PURE__ */ new Map();
var parents = /* @__PURE__ */ new Map();
var clear = /* @__PURE__ */ __name(() => {
  descendants.clear();
  parents.clear();
  clusterDb.clear();
}, "clear");
var isDescendant = /* @__PURE__ */ __name((id, ancestorId) => {
  const ancestorDescendants = descendants.get(ancestorId) || [];
  log.trace("In isDescendant", ancestorId, " ", id, " = ", ancestorDescendants.includes(id));
  return ancestorDescendants.includes(id);
}, "isDescendant");
var edgeInCluster = /* @__PURE__ */ __name((edge, clusterId) => {
  const clusterDescendants = descendants.get(clusterId) || [];
  log.info("Descendants of ", clusterId, " is ", clusterDescendants);
  log.info("Edge is ", edge);
  if (edge.v === clusterId || edge.w === clusterId) {
    return false;
  }
  if (!clusterDescendants) {
    log.debug("Tilt, ", clusterId, ",not in descendants");
    return false;
  }
  return clusterDescendants.includes(edge.v) || isDescendant(edge.v, clusterId) || isDescendant(edge.w, clusterId) || clusterDescendants.includes(edge.w);
}, "edgeInCluster");
var copy = /* @__PURE__ */ __name((clusterId, graph, newGraph, rootId) => {
  log.warn(
    "Copying children of ",
    clusterId,
    "root",
    rootId,
    "data",
    graph.node(clusterId),
    rootId
  );
  const nodes = graph.children(clusterId) || [];
  if (clusterId !== rootId) {
    nodes.push(clusterId);
  }
  log.warn("Copying (nodes) clusterId", clusterId, "nodes", nodes);
  nodes.forEach((node) => {
    if (graph.children(node).length > 0) {
      copy(node, graph, newGraph, rootId);
    } else {
      const data = graph.node(node);
      log.info("cp ", node, " to ", rootId, " with parent ", clusterId);
      newGraph.setNode(node, data);
      if (rootId !== graph.parent(node)) {
        log.warn("Setting parent", node, graph.parent(node));
        newGraph.setParent(node, graph.parent(node));
      }
      if (clusterId !== rootId && node !== clusterId) {
        log.debug("Setting parent", node, clusterId);
        newGraph.setParent(node, clusterId);
      } else {
        log.info("In copy ", clusterId, "root", rootId, "data", graph.node(clusterId), rootId);
        log.debug(
          "Not Setting parent for node=",
          node,
          "cluster!==rootId",
          clusterId !== rootId,
          "node!==clusterId",
          node !== clusterId
        );
      }
      const edges = graph.edges(node);
      log.debug("Copying Edges", edges);
      edges.forEach((edge) => {
        log.info("Edge", edge);
        const data2 = graph.edge(edge.v, edge.w, edge.name);
        log.info("Edge data", data2, rootId);
        try {
          if (edgeInCluster(edge, rootId)) {
            const rootDescendants = descendants.get(rootId) || [];
            const vIn = rootDescendants.includes(edge.v) || isDescendant(edge.v, rootId) || edge.v === rootId;
            const wIn = rootDescendants.includes(edge.w) || isDescendant(edge.w, rootId) || edge.w === rootId;
            if (vIn && wIn) {
              log.info("Copying as ", edge.v, edge.w, data2, edge.name);
              newGraph.setEdge(edge.v, edge.w, data2, edge.name);
              log.info("newGraph edges ", newGraph.edges(), newGraph.edge(newGraph.edges()[0]));
            } else {
              const newV = vIn ? rootId : edge.v;
              const newW = wIn ? rootId : edge.w;
              log.info("Rebinding cross-boundary edge as ", newV, newW, data2, edge.name);
              graph.setEdge(newV, newW, data2, edge.name);
            }
          } else {
            log.info(
              "Skipping copy of edge ",
              edge.v,
              "-->",
              edge.w,
              " rootId: ",
              rootId,
              " clusterId:",
              clusterId
            );
          }
        } catch (e) {
          log.error(e);
        }
      });
    }
    log.debug("Removing node", node);
    graph.removeNode(node);
  });
}, "copy");
var extractDescendants = /* @__PURE__ */ __name((id, graph) => {
  const children = graph.children(id);
  let res = [...children];
  for (const child of children) {
    parents.set(child, id);
    res = [...res, ...extractDescendants(child, graph)];
  }
  return res;
}, "extractDescendants");
var findCommonEdges = /* @__PURE__ */ __name((graph, id1, id2) => {
  const edges1 = graph.edges().filter((edge) => edge.v === id1 || edge.w === id1);
  const edges2 = graph.edges().filter((edge) => edge.v === id2 || edge.w === id2);
  const edges1Prim = edges1.map((edge) => {
    return { v: edge.v === id1 ? id2 : edge.v, w: edge.w === id1 ? id1 : edge.w };
  });
  const edges2Prim = edges2.map((edge) => {
    return { v: edge.v, w: edge.w };
  });
  const result = edges1Prim.filter((edgeIn1) => {
    return edges2Prim.some((edge) => edgeIn1.v === edge.v && edgeIn1.w === edge.w);
  });
  return result;
}, "findCommonEdges");
var findNonClusterChild = /* @__PURE__ */ __name((id, graph, clusterId) => {
  const children = graph.children(id);
  log.trace("Searching children of id ", id, children);
  if (children.length < 1) {
    return id;
  }
  let reserve;
  for (const child of children) {
    const _id = findNonClusterChild(child, graph, clusterId);
    const commonEdges = findCommonEdges(graph, clusterId, _id);
    if (_id) {
      if (commonEdges.length > 0) {
        reserve = _id;
      } else {
        return _id;
      }
    }
  }
  return reserve;
}, "findNonClusterChild");
var getAnchorId = /* @__PURE__ */ __name((id) => {
  if (!clusterDb.has(id)) {
    return id;
  }
  if (!clusterDb.get(id).externalConnections) {
    return id;
  }
  if (clusterDb.has(id)) {
    return clusterDb.get(id).id;
  }
  return id;
}, "getAnchorId");
var adjustClustersAndEdges = /* @__PURE__ */ __name((graph, depth) => {
  if (!graph || depth > 10) {
    log.debug("Opting out, no graph ");
    return;
  } else {
    log.debug("Opting in, graph ");
  }
  graph.nodes().forEach(function(id) {
    const children = graph.children(id);
    if (children.length > 0) {
      log.warn(
        "Cluster identified",
        id,
        " Replacement id in edges: ",
        findNonClusterChild(id, graph, id)
      );
      descendants.set(id, extractDescendants(id, graph));
      clusterDb.set(id, { id: findNonClusterChild(id, graph, id), clusterData: graph.node(id) });
    }
  });
  graph.nodes().forEach(function(id) {
    const children = graph.children(id);
    const edges = graph.edges();
    if (children.length > 0) {
      log.debug("Cluster identified", id, descendants);
      edges.forEach((edge) => {
        const d1 = isDescendant(edge.v, id);
        const d2 = isDescendant(edge.w, id);
        if (d1 ^ d2) {
          log.warn("Edge: ", edge, " leaves cluster ", id);
          log.warn("Descendants of XXX ", id, ": ", descendants.get(id));
          clusterDb.get(id).externalConnections = true;
        }
      });
    } else {
      log.debug("Not a cluster ", id, descendants);
    }
  });
  for (let id of clusterDb.keys()) {
    const nonClusterChild = clusterDb.get(id).id;
    const parent = graph.parent(nonClusterChild);
    if (parent !== id && clusterDb.has(parent) && !clusterDb.get(parent).externalConnections) {
      clusterDb.get(id).id = parent;
    }
    const hasDirectOutgoingEdge = graph.edges().some((edge) => edge.v === id);
    if (nonClusterChild && clusterDb.get(id)?.externalConnections && hasDirectOutgoingEdge && isNodeInExtractableCluster(graph, nonClusterChild, id)) {
      const safeAnchor = findSafeAnchorNode(graph, id, graph.parent(nonClusterChild));
      if (safeAnchor) {
        clusterDb.get(id).id = safeAnchor;
      }
    }
  }
  graph.edges().forEach(function(e) {
    const edge = graph.edge(e);
    log.warn("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(e));
    log.warn("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(graph.edge(e)));
    let v = e.v;
    let w = e.w;
    log.warn(
      "Fix XXX",
      clusterDb,
      "ids:",
      e.v,
      e.w,
      "Translating: ",
      clusterDb.get(e.v),
      " --- ",
      clusterDb.get(e.w)
    );
    if (clusterDb.get(e.v) || clusterDb.get(e.w)) {
      log.warn("Fixing and trying - removing XXX", e.v, e.w, e.name);
      v = getAnchorId(e.v);
      w = getAnchorId(e.w);
      graph.removeEdge(e.v, e.w, e.name);
      if (v !== e.v) {
        const parent = graph.parent(v);
        clusterDb.get(parent).externalConnections = true;
        edge.fromCluster = e.v;
      }
      if (w !== e.w) {
        const parent = graph.parent(w);
        clusterDb.get(parent).externalConnections = true;
        edge.toCluster = e.w;
      }
      log.warn("Fix Replacing with XXX", v, w, e.name);
      graph.setEdge(v, w, edge, e.name);
    }
  });
  log.warn("Adjusted Graph", write(graph));
  extractor(graph, 0);
  log.trace(clusterDb);
}, "adjustClustersAndEdges");
var extractor = /* @__PURE__ */ __name((graph, depth) => {
  log.warn("extractor - ", depth, write(graph), graph.children("D"));
  if (depth > 10) {
    log.error("Bailing out");
    return;
  }
  let nodes = graph.nodes();
  let hasChildren = false;
  for (const node of nodes) {
    const children = graph.children(node);
    hasChildren = hasChildren || children.length > 0;
  }
  if (!hasChildren) {
    log.debug("Done, no node has children", graph.nodes());
    return;
  }
  log.debug("Nodes = ", nodes, depth);
  for (const node of nodes) {
    log.debug(
      "Extracting node",
      node,
      clusterDb,
      clusterDb.has(node) && !clusterDb.get(node).externalConnections,
      !graph.parent(node),
      graph.node(node),
      graph.children("D"),
      " Depth ",
      depth
    );
    if (!clusterDb.has(node)) {
      log.debug("Not a cluster", node, depth);
    } else if (clusterDb.get(node)?.clusterData?.explicitDir && graph.children(node) && graph.children(node).length > 0) {
      log.warn("Cluster with explicit dir, creating subgraph for children", node, depth);
      const dir = clusterDb.get(node).clusterData.dir;
      const clusterGraph = new Graph({
        multigraph: true,
        compound: true
      }).setGraph({
        rankdir: dir,
        nodesep: 50,
        ranksep: 50,
        marginx: 8,
        marginy: 8
      }).setDefaultEdgeLabel(function() {
        return {};
      });
      copy(node, graph, clusterGraph, node);
      const clusterNodeData = graph.node(node) || {};
      graph.setNode(node, {
        ...clusterNodeData,
        clusterNode: true,
        id: node,
        clusterData: clusterDb.get(node).clusterData,
        label: clusterDb.get(node).label,
        graph: clusterGraph
      });
      log.warn(
        "Subgraph for cluster with explicit dir created:",
        node,
        write(clusterGraph)
      );
    } else if (!clusterDb.get(node).externalConnections && graph.children(node) && graph.children(node).length > 0) {
      log.warn(
        "Cluster without external connections, without a parent and with children",
        node,
        depth
      );
      const graphSettings = graph.graph();
      let dir = graphSettings.rankdir === "TB" ? "LR" : "TB";
      if (clusterDb.get(node)?.clusterData?.dir) {
        dir = clusterDb.get(node).clusterData.dir;
        log.warn("Fixing dir", clusterDb.get(node).clusterData.dir, dir);
      }
      const clusterGraph = new Graph({
        multigraph: true,
        compound: true
      }).setGraph({
        rankdir: dir,
        nodesep: 50,
        ranksep: 50,
        marginx: 8,
        marginy: 8
      }).setDefaultEdgeLabel(function() {
        return {};
      });
      copy(node, graph, clusterGraph, node);
      const clusterNodeData = graph.node(node) || {};
      graph.setNode(node, {
        ...clusterNodeData,
        clusterNode: true,
        id: node,
        clusterData: clusterDb.get(node).clusterData,
        label: clusterDb.get(node).label,
        graph: clusterGraph
      });
      log.debug("Old graph after copy", write(graph));
    } else {
      log.warn(
        "Cluster ** ",
        node,
        " **not meeting the criteria !externalConnections:",
        !clusterDb.get(node).externalConnections,
        " no parent: ",
        !graph.parent(node),
        " children ",
        graph.children(node) && graph.children(node).length > 0,
        graph.children("D"),
        depth
      );
      log.debug(clusterDb);
    }
  }
  nodes = graph.nodes();
  log.warn("New list of nodes", nodes);
  for (const node of nodes) {
    const data = graph.node(node);
    log.warn(" Now next level", node, data);
    if (data?.clusterNode) {
      extractor(data.graph, depth + 1);
    }
  }
}, "extractor");
var sorter = /* @__PURE__ */ __name((graph, nodes) => {
  if (nodes.length === 0) {
    return [];
  }
  let result = Object.assign([], nodes);
  nodes.forEach((node) => {
    const children = graph.children(node);
    const sorted = sorter(graph, children);
    result = [...result, ...sorted];
  });
  return result;
}, "sorter");
var sortNodesByHierarchy = /* @__PURE__ */ __name((graph) => sorter(graph, graph.children()), "sortNodesByHierarchy");
var isNodeInExtractableCluster = /* @__PURE__ */ __name((graph, node, rootId) => {
  let parent = graph.parent(node);
  while (parent && parent !== rootId) {
    const cluster = clusterDb.get(parent);
    if (cluster && !cluster.externalConnections) {
      return true;
    }
    parent = graph.parent(parent);
  }
  return false;
}, "isNodeInExtractableCluster");
var findSafeAnchorNode = /* @__PURE__ */ __name((graph, clusterId, excludedCluster) => {
  const children = graph.children(clusterId) ?? [];
  for (const child of children) {
    if (child === excludedCluster || isDescendant(child, excludedCluster)) {
      continue;
    }
    const candidate = findNonClusterChild(child, graph, clusterId);
    if (!candidate) {
      continue;
    }
    if (!isNodeInExtractableCluster(graph, candidate, clusterId)) {
      return candidate;
    }
  }
  return null;
}, "findSafeAnchorNode");

export { adjustClustersAndEdges as a, clusterDb as b, clear as c, findNonClusterChild as f, sortNodesByHierarchy as s, write as w };
