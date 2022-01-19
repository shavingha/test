import { assert } from 'console';
import { randInt } from '../common/math';

const MAX_AOI = 100;

function intersection(aNodeList: Array<Node>, bNodeList: Array<Node>) {
    return aNodeList.filter((item) => bNodeList.includes(item));
}

// 双链表（对象）
class Node {
    userdata: any;
    pos: number;
    aoi: number;
    prev: Node | undefined;
    next: Node | undefined;
    constructor(userdata: any, pos: number, aoi: number) {
        this.userdata = userdata;
        this.pos = pos;
        this.aoi = aoi;
    }
}

class Entity {
    xNode: Node;
    yNode: Node;
    userdata: any;
    aoi: number;
    constructor(xNode: Node, yNode: Node, userdata: any, aoi: number) {
        this.xNode = xNode;
        this.yNode = yNode;
        this.userdata = userdata;
        this.aoi = aoi;
    }
}

class NodeLink {
    _head = new Node('head', Number.MIN_VALUE, 0);
    _tail = new Node('tail', Number.MAX_VALUE, 0);
    constructor() {
        this._head.next = this._tail;
        this._tail.prev = this._head;
    }

    add(node: Node) {
        let cur = this._head.next;
        while (cur) {
            if (cur.pos > node.pos || cur == this._tail) {
                node.next = cur;
                node.prev = cur.prev;
                if (cur.prev) {
                    cur.prev.next = node;
                    cur.prev = node;
                }
                break;
            }
            cur = cur.next;
        }
    }

    //返回WatchList，ObList，即我可以看到的对象列表，可以看到我的对象列表
    getAOINodes(node: Node) {
        let prev = node.prev;
        let watcherList: Array<any> = [];
        let observerList: Array<any> = [];
        while (prev && Math.abs(prev.pos - node.pos) < MAX_AOI && prev != this._head) {
            if (Math.abs(prev.pos - node.pos) <= prev.aoi) {
                observerList.push(prev.userdata);
            }

            if (Math.abs(prev.pos - node.pos) <= node.aoi) {
                watcherList.push(prev.userdata);
            }
            prev = prev?.prev;
        }

        let next = node.next;
        while (next && Math.abs(next.pos - node.pos) < MAX_AOI && next != this._tail) {
            if (Math.abs(next.pos - node.pos) <= next.aoi) {
                observerList.push(next.userdata);
            }

            if (Math.abs(next.pos - node.pos) <= node.aoi) {
                watcherList.push(next.userdata);
            }
            next = next?.next;
        }

        return [watcherList, observerList];
    }

    remove(node: Node) {
        assert(node.prev && node.next);
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        node.prev = undefined;
        node.next = undefined;
    }
}

class SceneLink {
    xLink: NodeLink;
    yLink: NodeLink;
    constructor() {
        this.xLink = new NodeLink();
        this.yLink = new NodeLink();
    }

    getAOIList(xNode: Node, yNode: Node) {
        const [xWatcherList, xObserverList] = this.xLink.getAOINodes(xNode);
        const [yWatcherList, yObserverList] = this.yLink.getAOINodes(yNode);

        //求交集
        let watcherList = intersection(xWatcherList, yWatcherList);
        let observerList = intersection(xObserverList, yObserverList);
        return [watcherList, observerList];
    }

    enter(userdata: any, x: number, y: number, aoi: number) {
        let xNode = new Node(userdata, x, aoi);
        let yNode = new Node(userdata, y, aoi);
        let entity = new Entity(xNode, yNode, userdata, aoi);
        const [watcherList, observerList] = this._enter(entity);
        return [entity, watcherList, observerList];
    }

    _enter(entity: Entity) {
        this.xLink.add(entity.xNode);
        this.yLink.add(entity.yNode);

        return this.getAOIList(entity.xNode, entity.yNode);
    }

    leave(entity: Entity) {
        const [watcherList, observerList] = this.getAOIList(entity.xNode, entity.yNode);

        this.xLink.remove(entity.xNode);
        this.yLink.remove(entity.yNode);

        return [watcherList, observerList];
    }

    move(entity: Entity, x: number, y: number) {
        console.log('entity' + entity.xNode.userdata, 'from', entity.xNode.pos, entity.yNode.pos, 'move to', x, y);
        const [leaveWatcherList, leaveObserverList] = this.leave(entity);
        entity.xNode.pos = x;
        entity.yNode.pos = y;
        const [enterWatcherList, enterObserverList] = this._enter(entity);

        //在一次移动中发生了在离开列表，也在进入列表，说明没有发生aoi事件，剔除掉
        let retleaveWatcher = leaveWatcherList.filter((item) => !enterWatcherList.includes(item));
        let retenterWatcher = enterWatcherList.filter((item) => !leaveWatcherList.includes(item));
        let retleaveObserver = leaveObserverList.filter((item) => !enterObserverList.includes(item));
        let retenterObserver = enterObserverList.filter((item) => !leaveObserverList.includes(item));

        return [retleaveWatcher, retleaveObserver, retenterWatcher, retenterObserver];
    }
}

function test() {
    let scene = new SceneLink();
    let entities = new Map();
    for (let i = 0; i < 5; i++) {
        const ret = scene.enter(i, randInt(0, 20), randInt(0, 20), randInt(5, 10));
        entities.set(i, ret[0]);
    }

    function randMove() {
        //随机移动
        let keys = Array.from(entities.keys());
        let randId = randInt(0, entities.size - 1);
        let randKey = keys[randId];
        let entity = entities.get(randKey);

        const [leaveWatcherList, leaveObserverList, enterWatcherList, enterObserverList] = scene.move(
            entity,
            entity.xNode.pos + randInt(1, 2),
            entity.yNode.pos + randInt(1, 2),
        );

        for (let userdata of leaveWatcherList as Node[]) {
            let watchEntity = entities.get(userdata);
            console.log(
                'entity' + entity.userdata + '.' + entity.aoi,
                'x=' + entity.xNode?.pos,
                'y=' + entity.yNode?.pos,
                'leave',
                'entity' + userdata,
                'x=' + watchEntity.xNode.pos,
                'y=' + watchEntity.yNode.pos,
            );
        }

        for (let userdata of leaveObserverList as Node[]) {
            let watchEntity = entities.get(userdata);
            console.log(
                'entity' + userdata + '.' + watchEntity.aoi,
                'x=' + watchEntity.xNode.pos,
                'y' + watchEntity.yNode.pos,
                'see',
                'entity' + entity.userdata,
                'x=' + entity.xNode?.pos,
                'y=' + entity.yNode?.pos,
                'leave',
            );
        }
        for (let userdata of enterWatcherList as Node[]) {
            let watchEntity = entities.get(userdata);
            console.log(
                'entity' + entity.userdata + '.' + entity.aoi,
                'x=' + entity.xNode?.pos,
                'y=' + entity.yNode?.pos,
                'enter see',
                'entity' + userdata,
                'x=' + watchEntity.xNode.pos,
                'y=' + watchEntity.yNode.pos,
            );
        }

        for (let userdata of enterObserverList as Node[]) {
            let obsererEntity = entities.get(userdata);
            console.log(
                'entity' + userdata + '.' + obsererEntity.aoi,
                'x=' + obsererEntity.xNode.pos,
                'y' + obsererEntity.yNode.pos,
                'see',
                'entity' + entity.userdata,
                'x=' + entity.xNode?.pos,
                'y=' + entity.yNode?.pos,
                'enter',
            );
        }
    }

    setInterval(randMove, 3 * 1000);
}

test();
