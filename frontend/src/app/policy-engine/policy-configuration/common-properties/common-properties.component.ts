import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { BlockErrorActions, Schema, Token } from '@guardian/interfaces';
import { IBlockAbout, RegisteredBlocks } from '../../registered-blocks';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { PolicyBlockModel, PolicyEventModel, PolicyModel } from '../../policy-model';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'common-properties',
    templateUrl: './common-properties.component.html',
    styleUrls: ['./common-properties.component.css']
})
export class CommonPropertiesComponent implements OnInit {
    @ViewChild("configContainer", { read: ViewContainerRef }) configContainer!: ViewContainerRef;

    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;

    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;

    @Output() onInit = new EventEmitter();

    propHidden: any = {
        about: true,
        metaData: false,
        eventsGroup: {}
    };

    block!: PolicyBlockModel;
    about!: IBlockAbout;
    errorActions = [
        {
            label: 'No action',
            value: BlockErrorActions.NO_ACTION
        },
        {
            label: 'Retry',
            value: BlockErrorActions.RETRY
        },
        {
            label: 'Go to step',
            value: BlockErrorActions.GOTO_STEP
        },
        {
            label: 'Go to tag',
            value: BlockErrorActions.GOTO_TAG
        }
    ];
    events: PolicyEventModel[] = [];
    inputEvents: any[] = [];
    outputEvents: any[] = [];
    defaultEvent: boolean = false;

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngAfterViewInit(): void {
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    isOutputEvent(event: PolicyEventModel) {
        return event.isSource(this.block);
    }

    isInputEvent(event: PolicyEventModel) {
        return event.isTarget(this.block) && !this.isOutputEvent(event);
    }

    chanceType(event: any, item: PolicyEventModel) {
        if (event.value != this.isInputEvent(item)) {
            const s = item.source;
            item.source = item.target;
            item.target = s;
            item.output = "";
            item.input = "";
        }
        this.onSave();
    }

    isInvalid(item: PolicyEventModel) {
        return (
            !item.target ||
            !item.source ||
            !item.output ||
            !item.input ||
            (item.target == item.source)
        );
    }

    addEvent() {
        const event = {
            id: this.registeredBlocks.generateUUIDv4(),
            source: this.block,
            target: null,
            output: "",
            input: "",
            disabled: false
        }
        this.block.createEvent(event);
    }

    onRemoveEvent(event: PolicyEventModel) {
        this.policy.removeEvent(event);
    }

    load(block: PolicyBlockModel) {
        if (this.block != block && this.type == 'Events') {
            this.block = block;
            this.loadEvents(block);
        }
        if (this.block != block && this.type != 'Events') {
            this.loadEvents(block);
            this.loadComponent(block);
        }
    }

    loadEvents(block: PolicyBlockModel) {
        this.events = block.events;
        const about = this.registeredBlocks.getAbout(block.blockType, block);
        this.inputEvents = about.input;
        this.outputEvents = about.output;
        this.defaultEvent = about.defaultEvent;
    }

    getIcon(block: PolicyBlockModel) {
        return this.registeredBlocks.getIcon(block.blockType);
    }

    getOutputEvents(event: PolicyEventModel) {
        try {
            if (event.source && event.source.blockType) {
                const about = this.registeredBlocks.getAbout(event.source.blockType, event.source);
                return about.output || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    getInputEvents(event: PolicyEventModel) {
        try {
            if (event.target && event.target.blockType) {
                const about = this.registeredBlocks.getAbout(event.target.blockType, event.target);
                return about.input || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    loadComponent(block: PolicyBlockModel) {
        if (!this.configContainer) {
            return;
        }
        setTimeout(() => {
            this.block = block;
            if (!this.block.properties.onErrorAction) {
                this.block.properties.onErrorAction = BlockErrorActions.NO_ACTION;
            }
            this.configContainer.clear();
            const factory: any = this.registeredBlocks.getProperties(block.blockType);
            this.about = this.registeredBlocks.bindAbout(block.blockType, block);
            if (factory) {
                let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
                let componentRef: any = this.configContainer.createComponent(componentFactory);
                componentRef.instance.policy = this.policy;
                componentRef.instance.currentBlock = this.currentBlock;
                componentRef.instance.schemas = this.schemas;
                componentRef.instance.tokens = this.tokens;
                componentRef.instance.readonly = this.readonly;
            }
        })
    }

    onSave() {
        if(this.block) {
            this.block.emitUpdate();
        }
    }
}
