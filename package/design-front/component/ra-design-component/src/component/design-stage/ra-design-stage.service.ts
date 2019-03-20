import {
  ChangeDetectorRef,
  ComponentFactory,
  ComponentFactoryResolver,
  Injectable,
  ViewContainerRef
} from '@angular/core';
import {StageTabModel, StageTabServerModel} from './interface';
import {RaDesignStageComponent} from './ra-design-stage.component';
import {PageEditorInterface} from './page-editor/page-editor.interface';
import {moveItemInArray} from '../cdk-drag-drop';

export enum StageFactory {
  PageEditor = 'pageEditor',
}

@Injectable()
export class RaDesignStageService {
  /**
   * static
   */
  stageList: StageTabModel[] = [];
  private stageMap: Map<string, StageTabModel> = new Map();
  private factory: Map<String, ComponentFactory<any>> = new Map();
  private RaDesignStageComponent: RaDesignStageComponent;

  constructor(public ComponentFactoryResolver: ComponentFactoryResolver) {
  }

  init(RaDesignStageComponent: RaDesignStageComponent) {
    this.RaDesignStageComponent = RaDesignStageComponent;
    this.factory.set(StageFactory.PageEditor, this.ComponentFactoryResolver.resolveComponentFactory(PageEditorInterface));
  }

  putStage(tools: StageFactory, stageTabServer: StageTabServerModel) {
    if (this.stageMap.get(stageTabServer.id)) {
      this.openStage(stageTabServer.id);
      return;
    }

    switch (tools) {
      case StageFactory.PageEditor:
        const stage = {
          factory: StageFactory.PageEditor,
          icon: 'rabbit-design:icon-page',
          ...stageTabServer,
        };
        this.stageList.push(stage);
        this.stageMap.set(stageTabServer.id, stage);
        break;
      default:
        throw new Error('NotStageFactory');
    }
    this.stageList.forEach(stage => stage.select = false);
    this.stageMap.get(stageTabServer.id).select = true;
    this.RaDesignStageComponent.showTools(this.factory.get(tools));
  }

  deleteStage(stageID: string) {
    const stageTab = this.stageMap.get(stageID);
    this.stageMap.delete(stageID);
    this.stageList.splice(this.stageList.indexOf(stageTab), 1);
  }

  openStage(stageID: string) {
    const stage = this.stageMap.get(stageID);
    if (stage.select) {
      return;
    }
    this.stageList.forEach(stage => stage.select = false);
    stage.select = true;
    this.RaDesignStageComponent.showTools(this.factory.get(stage.factory));
  }

  moveItemInArray(fromIndex: number, toIndex: number): void {
    moveItemInArray(this.stageList, fromIndex, toIndex);
    this.RaDesignStageComponent.ChangeDetectorRef.markForCheck();
  }
}
