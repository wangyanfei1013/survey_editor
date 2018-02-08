import * as ko from "knockout";
import * as Survey from "survey-knockout";
import { SurveyPropertyEditorBase } from "./propertyEditorBase";
import { SurveyPropertyEditorFactory } from "./propertyEditorFactory";
import { editorLocalization } from "../editorLocalization";
import RModal from "rmodal";
import insertAtCursor from "../utils/insertAtCursor";

export class SurveyPropertyModalEditorCustomWidget {
  private static customWidgetId = 1;
  private static customWidgetName = "modalEditorCustomWidget";
  constructor(public json: any) {}
  public afterRender(editor: SurveyPropertyModalEditor, el: HTMLElement) {
    if (this.json && this.json.afterRender) {
      if (!el.id) {
        el.id =
          SurveyPropertyModalEditorCustomWidget.customWidgetName +
          SurveyPropertyModalEditorCustomWidget.customWidgetId;
        SurveyPropertyModalEditorCustomWidget.customWidgetId++;
      }
      this.json.afterRender(editor, el);
      if (this.json.destroy) {
        var self = this;
        ko.utils.domNodeDisposal.addDisposeCallback(el, function() {
          self.destroy(editor, el);
        });
      }
    }
  }
  public destroy(editor: SurveyPropertyModalEditor, el: HTMLElement) {
    if (this.json && this.json.destroy) {
      this.json.destroy(editor, el);
    }
  }
}

export class SurveyPropertyModalEditor extends SurveyPropertyEditorBase {
  private static customWidgets;
  public static registerCustomWidget(editorType: string, json: any) {
    if (!SurveyPropertyModalEditor.customWidgets)
      SurveyPropertyModalEditor.customWidgets = {};
    SurveyPropertyModalEditor.customWidgets[
      editorType
    ] = new SurveyPropertyModalEditorCustomWidget(json);
  }
  private static idCounter = 1;
  public static getCustomWidget(
    editorType: string
  ): SurveyPropertyModalEditorCustomWidget {
    if (!SurveyPropertyModalEditor.customWidgets) return null;
    return SurveyPropertyModalEditor.customWidgets[editorType];
  }
  private isShowingModalValue: boolean = false;
  public editingObject: any;
  public onApplyClick: any;
  public onOkClick: any;
  public onResetClick: any;
  public onShowModal: any;
  public onHideModal: any;
  public modalName: string;
  public modalNameTarget: string;
  koShowApplyButton: any;
  koTitleCaption: any;
  koAfterRender: any;
  koHtmlTop: any;
  koHtmlBottom: any;
  constructor(property: Survey.JsonObjectProperty) {
    super(property);
    this.koTitleCaption = ko.observable("");
    this.koHtmlTop = ko.observable("");
    this.koHtmlBottom = ko.observable("");
    if (this.property) {
      this.koTitleCaption(
        editorLocalization
          .getString("pe.editProperty")
          ["format"](this.property.name)
      );
    }
    var name = property ? property.name : "";
    this.modalName =
      "modelEditor" + this.editorType + SurveyPropertyModalEditor.idCounter;
    SurveyPropertyModalEditor.idCounter++;
    this.modalNameTarget = "#" + this.modalName;
    var self = this;
    this.koShowApplyButton = ko.observable(true);

    self.onHideModal = function() {};
    self.onApplyClick = function() {
      self.apply();
    };
    self.onOkClick = function() {
      self.apply();
      if (!self.koHasError()) self.onHideModal();
    };
    self.onResetClick = function() {
      self.reset();
      self.onHideModal();
    };
    self.onShowModal = function() {
      self.beforeShowModal();
      var modal = new RModal(document.querySelector(self.modalNameTarget), {
        bodyClass: "",
        closeTimeout: 100,
        dialogOpenClass: "animated fadeInDown",
        focus: false
      });
      modal.open();

      document.addEventListener(
        "keydown",
        function(ev) {
          modal.keydown(ev);
        },
        false
      );

      self.onHideModal = function() {
        self.beforeCloseModal();
        modal.close();
      };
    };
    self.koAfterRender = function(el, con) {
      return self.afterRender(el, con);
    };
  }
  public setup() {
    this.showDisplayName = true;
    this.beforeShowModal();
  }
  public get isModal(): boolean {
    return true;
  }
  public get isShowingModal(): boolean {
    return this.isShowingModalValue;
  }
  public beforeShowModal() {
    this.isShowingModalValue = true;
  }
  public beforeCloseModal() {
    this.isShowingModalValue = false;
  }
  protected onOptionsChanged() {
    this.koShowApplyButton = ko.observable(
      !this.options || this.options.showApplyButtonInEditors
    );
  }
  private reset() {
    this.editingValue = this.koValue();
  }
  public setObject(value: any) {
    this.editingObject = value;
    super.setObject(value);
    if (this.options && this.property) {
      var html = this.options.onPropertyEditorModalShowDescriptionCallback(
        this.property.name,
        value
      );
      if (html) {
        if (html.top) this.koHtmlTop(html.top);
        if (html.bottom) this.koHtmlBottom(html.bottom);
      }
    }
  }
  public get isEditable(): boolean {
    return false;
  }
  protected afterRender(elements, con) {
    var customWidget = SurveyPropertyModalEditor.getCustomWidget(
      this.editorType
    );
    if (!customWidget) return;
    var el = this.GetFirstNonTextElement(elements);
    var tEl = elements[0];
    if (tEl.nodeName == "#text") tEl.data = "";
    tEl = elements[elements.length - 1];
    if (tEl.nodeName == "#text") tEl.data = "";
    customWidget.afterRender(this, el);
  }
  private GetFirstNonTextElement(elements: any) {
    if (!elements || !elements.length) return;
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].nodeName != "#text" && elements[i].nodeName != "#comment")
        return elements[i];
    }
    return null;
  }
}

export class SurveyPropertyTextEditor extends SurveyPropertyModalEditor {
  public koTextValue: any;

  constructor(property: Survey.JsonObjectProperty) {
    super(property);
    this.koTextValue = ko.observable();
  }
  public get editorType(): string {
    return "text";
  }
  public get isEditable(): boolean {
    return true;
  }
  public getValueText(value: any): string {
    if (!value) return null;
    var str = value;
    if (str.length > 20) {
      str = str.substr(0, 20) + "...";
    }
    return str;
  }
  protected onValueChanged() {
    this.koTextValue(this.editingValue);
  }
  protected onBeforeApply() {
    this.setValueCore(this.koTextValue());
  }
}

export class SurveyPropertyHtmlEditor extends SurveyPropertyTextEditor {
  constructor(property: Survey.JsonObjectProperty) {
    super(property);
  }
  public get editorType(): string {
    return "html";
  }
}

export class SurveyPropertyConditionEditor extends SurveyPropertyTextEditor {
  public koQuestionSelected: any;
  public questionItems: any;
  constructor(property: Survey.JsonObjectProperty, private _type: string) {
    super(property);
    this.koQuestionSelected = ko.observable();
    this.questionItems =  ko.observableArray([]);
    
  
  }
  public get editorType(): string {
    return this._type;
  }
  public get availableQuestions(): any[] {
    // console.log(this.object.survey.getAllQuestions())
    return (this.object && this.object.survey.getAllQuestions()) || [];
  }

  public insertQuestion(question, element) {
    // console.log(question)
    var textarea = element.parentNode.parentNode.parentNode.querySelector(
      "textarea"
    );
    insertAtCursor(textarea, "{" + question.name + "}");
   
  }

 
  public getItemsOfQuestion(element){
    this.questionItems.removeAll()
   var choices = this.koQuestionSelected().choices || [];
   var len = choices.length;

   for(var i=0;i<len;i++){
    this.questionItems.push(choices[i]);  
   }

   //切换问题 重置条件设置
   var textarea = element.parentNode.parentNode.parentNode.parentNode.querySelector(
    "input[type=hidden]"
  );
   textarea.value = '';
  }
  public setQuestionItem(data,element){
    var textarea = element.parentNode.parentNode.parentNode.parentNode.querySelector(
      "input[type=hidden]"
    );
    var visibleifContent = textarea.value;
    var itemValue = data.value;
    if(element.checked){
      var delimiters = '';
      var questionName = this.koQuestionSelected().name;
      if(visibleifContent.indexOf('=') > -1){
        delimiters = ' or ';
      }
      insertAtCursor(textarea, delimiters+'{'+questionName+'}'+"='" + itemValue + "'");
    }else{
      var contentSplitData = visibleifContent.split(' or ');
      contentSplitData.forEach((val, idx, array) => {
          if (val.indexOf(itemValue) > -1) {
            contentSplitData.splice(idx, 1)
            var newVisibleifContent = contentSplitData.join(' or ');
            textarea.value = newVisibleifContent;
        }
      });

    }
  
  }

}

export class SurveyPropertyWordtemplateEditor extends SurveyPropertyTextEditor {
  constructor(property: Survey.JsonObjectProperty) {
    super(property);
  }
  public get editorType(): string {
    return 'wordtemplate';
  }
  public insertStudentTag(tagName,element){
    var textarea = element.parentNode.parentNode.parentNode.querySelector(
      "textarea"
    );
    insertAtCursor(textarea, "{" + tagName + "}");
  }
}

SurveyPropertyEditorFactory.registerEditor("text", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyTextEditor(property);
});
SurveyPropertyEditorFactory.registerEditor("html", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyHtmlEditor(property);
});
SurveyPropertyEditorFactory.registerEditor("condition", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyConditionEditor(property, "condition");
});
SurveyPropertyEditorFactory.registerEditor("expression", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyConditionEditor(property, "expression");
});
//话术模版
SurveyPropertyEditorFactory.registerEditor("wordtemplate",function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyWordtemplateEditor(property);
})
