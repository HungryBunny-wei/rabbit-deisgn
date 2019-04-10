import {Injectable} from '@angular/core';
import {isNotNil} from 'ng-zorro-antd';
import {NzFormatEmitEvent} from './interface';
import {TreeNodeModel} from './tree-node.model';
import {isCheckDisabled, isInArray} from './nz-tree-util';

@Injectable()
export class RaDesignTreeService {
  DRAG_SIDE_RANGE = 0.25;
  DRAG_MIN_GAP = 2;

  conductOption: {
    isCheckStrictly: boolean
  } = {
    isCheckStrictly: false
  };
  selectedNode: TreeNodeModel;
  targetNode: TreeNodeModel;
  rootNodes: TreeNodeModel[] = [];
  selectedNodeList: TreeNodeModel[] = [];
  expandedNodeList: TreeNodeModel[] = [];
  checkedNodeList: TreeNodeModel[] = [];
  halfCheckedNodeList: TreeNodeModel[] = [];
  matchedNodeList: TreeNodeModel[] = [];

  static forEachTree<T>(node: Array<T & { children?: T[] }>, call: (value: T) => boolean | void) {
    node.forEach((_n) => {
      if (call(_n)) {
        return true;
      }
      if (_n.children && _n.children.length > 0) {
        RaDesignTreeService.forEachTree(_n.children, call);
      }
    });
  }

  /**
   * reset tree nodes will clear default node list
   */
  initTree(nzNodes: TreeNodeModel[]): void {
    this.rootNodes = nzNodes;
    this.expandedNodeList = [];
    this.selectedNodeList = [];
    this.halfCheckedNodeList = [];
    this.checkedNodeList = [];
    this.expandedNodeList = [];
    this.matchedNodeList = [];
    setTimeout(() => {
      this.refreshCheckState(this.conductOption.isCheckStrictly);
    });
  }

  getSelectedNode(): TreeNodeModel | null {
    return this.selectedNode;
  }

  /**
   * get some list
   */
  getSelectedNodeList(): TreeNodeModel[] {
    return this.conductNodeState('select');
  }

  /**
   * return checked nodes
   */
  getCheckedNodeList(): TreeNodeModel[] {
    return this.conductNodeState('check');
  }

  getHalfCheckedNodeList(): TreeNodeModel[] {
    return this.conductNodeState('halfCheck');
  }

  /**
   * return expanded nodes
   */
  getExpandedNodeList(): TreeNodeModel[] {
    return this.conductNodeState('expand');
  }

  /**
   * return search matched nodes
   */
  getMatchedNodeList(): TreeNodeModel[] {
    return this.conductNodeState('match');
  }

  // tslint:disable-next-line:no-any
  isArrayOfNzTreeNode(value: any[]): boolean {
    return value.every(item => item instanceof TreeNodeModel);
  }

  /**
   * reset selectedNodeList
   */
  calcSelectedKeys(selectedKeys: string[], nzNodes: TreeNodeModel[], isMulti: boolean = false): void {
    this.selectedNodeList = [];
    const calc = (nodes: TreeNodeModel[]) => {
      nodes.forEach(node => {
        if (isInArray(node.key, selectedKeys)) {
          node.setSelected(true);
        } else {
          node.setSelected(false);
        }
        this.setSelectedNodeList(node, isMulti);
        if (node.getChildren().length > 0) {
          calc(node.getChildren());
        }
      });
    };
    calc(nzNodes);
  }

  /**
   * reset expandedNodeList
   */
  calcExpandedKeys(expandedKeys: string[], nzNodes: TreeNodeModel[]): void {
    this.expandedNodeList = [];
    const calc = (nodes: TreeNodeModel[]) => {
      nodes.forEach(node => {
        if (isInArray(node.key, expandedKeys)) {
          node.setExpanded(true);
          this.setExpandedNodeList(node);
        } else {
          node.setExpanded(false);
        }
        if (node.getChildren().length > 0) {
          calc(node.getChildren());
        }
      });
    };
    calc(nzNodes);
  }

  /**
   * reset checkedNodeList
   */
  calcCheckedKeys(checkedKeys: string[], nzNodes: TreeNodeModel[], isCheckStrictly: boolean = false): void {
    this.checkedNodeList = [];
    this.halfCheckedNodeList = [];
    const calc = (nodes: TreeNodeModel[]) => {
      nodes.forEach(node => {
        if (isInArray(node.key, checkedKeys)) {
          node.setChecked(true);
          this.setCheckedNodeList(node);
        } else {
          node.setChecked(false);
        }
        if (node.getChildren().length > 0) {
          calc(node.getChildren());
        }
      });
    };
    calc(nzNodes);
    // controlled state
    this.refreshCheckState(isCheckStrictly);
  }

  /**
   * set drag node
   */
  setSelectedNode(node?: TreeNodeModel): void {
    this.selectedNode = null;
    if (node) {
      this.selectedNode = node;
    }
  }

  /**
   * set node selected status
   */
  setNodeActive(node: TreeNodeModel, isMultiple: boolean = false): void {
    if (node.isDisabled) {
      return;
    }
    if (!isMultiple) {
      this.selectedNodeList.forEach(n => {
        n.setSelected(false);
      });
      this.selectedNodeList = [];
    }
    node.setSelected(true);
    this.setSelectedNodeList(node, isMultiple);
  }

  /**
   * add or remove node to selectedNodeList
   */
  setSelectedNodeList(node: TreeNodeModel, isMultiple: boolean = false): void {
    const index = this.selectedNodeList.findIndex(n => node.key === n.key);
    if (isMultiple) {
      if (node.isSelected && index === -1) {
        this.selectedNodeList.push(node);
      }
    } else {
      if (node.isSelected && index === -1) {
        this.selectedNodeList = [node];
      }
    }
    if (!node.isSelected && index > -1) {
      this.selectedNodeList.splice(index, 1);
    }
  }

  /**
   * merge checked nodes
   */
  setHalfCheckedNodeList(node: TreeNodeModel): void {
    const index = this.halfCheckedNodeList.findIndex(n => node.key === n.key);
    if (node.isHalfChecked && index === -1) {
      this.halfCheckedNodeList.push(node);
    } else if (!node.isHalfChecked && index > -1) {
      this.halfCheckedNodeList.splice(index, 1);
    }
  }

  setCheckedNodeList(node: TreeNodeModel): void {
    const index = this.checkedNodeList.findIndex(n => node.key === n.key);
    if (node.isChecked && index === -1) {
      this.checkedNodeList.push(node);
    } else if (!node.isChecked && index > -1) {
      this.checkedNodeList.splice(index, 1);
    }
  }

  /**
   * conduct checked/selected/expanded keys
   */
  conductNodeState(type: string = 'check'): TreeNodeModel[] {
    const resultNodesList = [];
    const loop = (node: TreeNodeModel) => {
      switch (type) {
        case 'check':
          if (node.isChecked) {
            resultNodesList.push(node);
          }
          if (!this.conductOption.isCheckStrictly) {
            if (!node.isChecked) {
              node.getChildren().forEach(child => {
                loop(child);
              });
            }
          } else {
            node.getChildren().forEach(child => {
              loop(child);
            });
          }
          break;
        case 'halfCheck':
          if (!this.conductOption.isCheckStrictly) {
            if (node.isHalfChecked) {
              resultNodesList.push(node);
              node.getChildren().forEach(child => {
                loop(child);
              });
            }
          }
          break;
        case 'select':
          if (node.isSelected) {
            resultNodesList.push(node);
          }
          node.getChildren().forEach(child => {
            loop(child);
          });
          break;
        case 'expand':
          if (node.isExpanded) {
            resultNodesList.push(node);
          }
          node.getChildren().forEach(child => {
            loop(child);
          });
          break;
        case 'match':
          if (node.isMatched) {
            resultNodesList.push(node);
          }
          node.getChildren().forEach(child => {
            loop(child);
          });
          break;
      }
    };
    this.rootNodes.forEach(node => {
      loop(node);
    });
    return resultNodesList;
  }

  /**
   * set expanded nodes
   */
  setExpandedNodeList(node: TreeNodeModel): void {
    if (node.isLeaf) {
      return;
    }
    const index = this.expandedNodeList.findIndex(n => node.key === n.key);
    if (node.isExpanded && index === -1) {
      this.expandedNodeList.push(node);
    } else if (!node.isExpanded && index > -1) {
      this.expandedNodeList.splice(index, 1);
    }
  }

  expandParent(p: TreeNodeModel) {
    // expand parent node
    if (p.getParentNode()) {
      p.getParentNode().setExpanded(true);
      this.setExpandedNodeList(p.getParentNode());
      this.expandParent(p.getParentNode());
    }
  }

  /**
   * check state
   * @param node
   */
  refreshCheckState(isCheckStrictly: boolean = false): void {
    if (isCheckStrictly) {
      return;
    }

    this.checkedNodeList.forEach(node => {
      this.conduct(node);
    });
  }

  conduct(node: TreeNodeModel): void {
    const isChecked = node.isChecked;
    if (node) {
      this.conductUp(node);
      this.conductDown(node, isChecked);
    }
  }

  /**
   * 1、children half checked
   * 2、children all checked, parent checked
   * 3、no children checked
   */
  conductUp(node: TreeNodeModel): void {
    const parentNode = node.getParentNode();
    // 全禁用节点不选中
    if (parentNode) {
      if (!isCheckDisabled(parentNode)) {
        if (parentNode.getChildren().every(child => isCheckDisabled(child) || (!child.isHalfChecked && child.isChecked))) {
          parentNode.setChecked(true);
        } else if (parentNode.getChildren().some(child => child.isHalfChecked || child.isChecked)) {
          parentNode.setChecked(false, true);
        } else {
          parentNode.setChecked(false);
        }
      }
      this.setHalfCheckedNodeList(parentNode);
      this.conductUp(parentNode);
    }
  }

  /**
   * reset child check state
   */
  conductDown(node: TreeNodeModel, value: boolean): void {
    if (!isCheckDisabled(node)) {
      node.setChecked(value);
      node.children.forEach(n => {
        this.conductDown(n, value);
      });
    }
  }

  /**
   * search value & expand node
   * should add expandlist
   */
  searchExpand(value: string): void {
    this.matchedNodeList = [];
    if (!isNotNil(value)) {
      return;
    }
    // to reset expandedNodeList
    this.expandedNodeList = [];
    const expandParent = (p: TreeNodeModel) => {
      // expand parent node
      if (p.getParentNode()) {
        p.getParentNode().setExpanded(true);
        this.setExpandedNodeList(p.getParentNode());
        expandParent(p.getParentNode());
      }
    };
    const searchChild = (n: TreeNodeModel) => {
      if (value && n.title.includes(value)) {
        // match the node
        n.isMatched = true;
        this.matchedNodeList.push(n);
        // expand parentNode
        expandParent(n);
      } else {
        n.isMatched = false;
        n.setExpanded(false);
        this.setExpandedNodeList(n);
      }
      n.children.forEach(g => {
        searchChild(g);
      });
    };
    this.rootNodes.forEach(child => {
      searchChild(child);
    });
  }

  /**
   * drag event
   */
  refreshDragNode(node: TreeNodeModel): void {
    if (node.getChildren().length === 0) {
      // until root
      this.conductUp(node);
    } else {
      node.children.forEach((child) => {
        this.refreshDragNode(child);
      });
    }
  }

  // reset node level
  resetNodeLevel(node: TreeNodeModel): void {
    if (node.getParentNode()) {
      node.level = node.getParentNode().level + 1;
    } else {
      node.level = 0;
    }
    for (const child of node.getChildren()) {
      this.resetNodeLevel(child);
    }
  }

  calcDropPosition(event: DragEvent): number {
    const {clientY} = event;
    // to fix firefox undefined
    const {top, bottom, height} = event.srcElement ? event.srcElement.getBoundingClientRect() : (event.target as Element).getBoundingClientRect();
    const des = Math.max(height * this.DRAG_SIDE_RANGE, this.DRAG_MIN_GAP);

    if (clientY <= top + des) {
      return -1;
    } else if (clientY >= bottom - des) {
      return 1;
    }

    return 0;
  }

  /**
   * drop
   * 0: inner -1: pre 1: next
   */
  dropAndApply(targetNode: TreeNodeModel, dragPos: number = -1): void {
    if (!targetNode || dragPos > 1) {
      return;
    }
    const targetParent = targetNode.getParentNode();
    const isSelectedRootNode = this.selectedNode.getParentNode();
    // remove the dragNode
    if (isSelectedRootNode) {
      isSelectedRootNode.getChildren().splice(isSelectedRootNode.getChildren().indexOf(this.selectedNode), 1);
    } else {
      this.rootNodes.splice(this.rootNodes.indexOf(this.selectedNode), 1);
    }
    switch (dragPos) {
      case 0:
        targetNode.addChildren([this.selectedNode]);
        this.resetNodeLevel(targetNode);
        break;
      case -1:
      case 1:
        const tIndex = dragPos === 1 ? 1 : 0;
        if (targetParent) {
          targetParent.addChildren([this.selectedNode], targetParent.children.indexOf(targetNode) + tIndex);
          if (this.selectedNode.getParentNode()) {
            this.resetNodeLevel(this.selectedNode.getParentNode());
          }
        } else {
          const targetIndex = this.rootNodes.indexOf(targetNode) + tIndex;
          // 根节点插入
          this.rootNodes.splice(targetIndex, 0, this.selectedNode);
          this.rootNodes[targetIndex].parentNode = null;
          this.rootNodes[targetIndex].level = 0;
        }
        break;
    }
    // flush all nodes
    this.rootNodes.forEach((child) => {
      this.refreshDragNode(child);
    });
  }

  /**
   * emit Structure
   * eventName
   * node
   * event: MouseEvent / DragEvent
   * dragNode
   */
  formatEvent(eventName: string, node: TreeNodeModel, event: MouseEvent | DragEvent): NzFormatEmitEvent {
    const emitStructure = {
      'eventName': eventName,
      'node': node,
      'event': event
    };
    switch (eventName) {
      case 'dragstart':
      case 'dragenter':
      case 'dragover':
      case 'dragleave':
      case 'drop':
      case 'dragend':
        Object.assign(emitStructure, {'dragNode': this.getSelectedNode()});
        break;
      case 'click':
      case 'dblclick':
      case 'contextmenu':
      case 'touchstart':
        Object.assign(emitStructure, {'selectedKeys': this.getSelectedNodeList()});
        Object.assign(emitStructure, {'nodes': this.getSelectedNodeList()});
        Object.assign(emitStructure, {'keys': this.getSelectedNodeList().map(n => n.key)});
        break;
      case 'check':
        Object.assign(emitStructure, {'checkedKeys': this.getCheckedNodeList()});
        Object.assign(emitStructure, {'nodes': this.getCheckedNodeList()});
        Object.assign(emitStructure, {'keys': this.getCheckedNodeList().map(n => n.key)});
        break;
      case 'search':
        Object.assign(emitStructure, {'matchedKeys': this.getMatchedNodeList()});
        Object.assign(emitStructure, {'nodes': this.getMatchedNodeList()});
        Object.assign(emitStructure, {'keys': this.getMatchedNodeList().map(n => n.key)});
        break;
      case 'expand':
        Object.assign(emitStructure, {'nodes': this.getExpandedNodeList()});
        Object.assign(emitStructure, {'keys': this.getExpandedNodeList().map(n => n.key)});
        break;
    }
    return emitStructure;
  }

}
