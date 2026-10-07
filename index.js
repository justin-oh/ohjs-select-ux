class SelectUX {
  #el;
  #select;
  #dropdown;
  #search;
  #scrollBox;
  #disabled;

  constructor({
    htmlSelectElement,
    className = 'select-ux',
    selectPlaceholderClassName = 'select-ux__select__placeholder',
    selectPlaceholder = 'Choose an option',
    selectValuesClassName = 'select-ux__select__values',
    selectValueClassName = 'select-ux__select__value',
    dropdownClassName = 'select-ux__dropdown',
    searchClassName = 'select-ux__search',
    searchPlaceholder = 'Search options...',
    scrollBoxClassName = 'select-ux__scroll-box',
    scrollBoxEmptyMessageClassName = 'select-ux__scroll-box__empty',
    scrollBoxEmptyMessage = 'No options found.',
    optionClassName = 'select-ux__option',
    optionInputClassName = 'select-ux__option__input',
    optionLabelClassName = 'select-ux__option__label',
    groupClassName = 'select-ux__group',
    groupHeadingClassName = 'select-ux__group__heading',
    groupHeadingLevel = 4,
  }) {
    if (!(htmlSelectElement instanceof HTMLSelectElement)) {
      throw new Error('You must provide a <select> element.');
    }

    if (!htmlSelectElement.id || !htmlSelectElement.name) {
      throw new Error('The <select> element must have ID and NAME attributes.');
    }

    if (htmlSelectElement.multiple && !htmlSelectElement.name.endsWith('[]')) {
      throw new Error(
        'The NAME of the <select multiple> element must end with [].',
      );
    }

    this.#disabled = htmlSelectElement.disabled;

    this.#el = document.createElement('div');
    this.#el.className = className;
    this.#el.style.setProperty('position', 'relative', 'important');

    this.#select = new SelectUXSelect({
      htmlSelectElement: htmlSelectElement,
      placeholderClassName: selectPlaceholderClassName,
      placeholder: selectPlaceholder,
      valuesClassName: selectValuesClassName,
      valueClassName: selectValueClassName,
    });

    this.#el.appendChild(this.#select.getEl());

    this.#dropdown = document.createElement('div');
    this.#dropdown.className = dropdownClassName;
    this.#dropdown.style.setProperty('display', 'none', 'important');
    this.#dropdown.style.setProperty('position', 'absolute', 'important');
    this.#dropdown.style.setProperty('left', '0', 'important');
    this.#dropdown.style.setProperty('right', '0', 'important');
    this.#dropdown.style.setProperty('z-index', '9999', 'important');

    this.#el.appendChild(this.#dropdown);

    this.#search = new SelectUXSearch({
      className: searchClassName,
      placeholder: searchPlaceholder,
    });

    this.#dropdown.appendChild(this.#search.getEl());

    this.#scrollBox = new SelectUXScrollBox({
      htmlSelectElement,
      className: scrollBoxClassName,
      emptyMessageClassName: scrollBoxEmptyMessageClassName,
      emptyMessage: scrollBoxEmptyMessage,
      optionClassName,
      optionInputClassName,
      optionLabelClassName,
      groupClassName,
      groupHeadingClassName,
      groupHeadingLevel,
    });

    this.#dropdown.appendChild(this.#scrollBox.getEl());

    htmlSelectElement.after(this.#el);

    htmlSelectElement.remove();

    this.#el.addEventListener('click', (e) => {
      // prevents click events from bubbling to the document
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      // clicking anywhere outside of the SelectUX DOM
      // will close the dropdown
      this.#closeDropdown(false);
    });

    document.addEventListener('focusin', (e) => {
      if (!this.#el.contains(e.target)) {
        // something received focus outside of the SelectUX
        this.#closeDropdown(false);
      }
    });

    this.#el.addEventListener('select-ux:select:toggle', () => {
      this.#toggleDropdown();
    });

    this.#el.addEventListener('select-ux:select:open', () => {
      this.#openDropdown();
    });

    this.#el.addEventListener('select-ux:select:close', () => {
      this.#closeDropdown(true);
    });

    this.#el.addEventListener('select-ux:option:escape', () => {
      this.#closeDropdown(true);
    });

    this.#el.addEventListener('select-ux:search:change', () => {
      this.#onSearchChange();
    });

    this.#el.addEventListener('select-ux:option:change', () => {
      this.#onInputChange();

      this.#el.dispatchEvent(new Event('select-ux:change'));
    });

    this.#onSearchChange();
    this.#onInputChange();
  }

  setDisabled(disabled) {
    this.#disabled = disabled;
    this.#select.setDisabled(disabled);
  }

  getEl() {
    return this.#el;
  }

  getValue() {
    return this.#scrollBox.getValue();
  }

  setValue(value) {
    if (null !== value && typeof value !== 'string' && !Array.isArray(value)) {
      throw new Error('`value` must be null, string, or array');
    }

    value = value.split(',');

    this.#scrollBox.setValue(value);

    this.#onInputChange();
  }

  setRequired(required) {
    this.#select.setRequired(required);
  }

  clearOptions() {
    this.#scrollBox.clearOptions();

    this.#onSearchChange();
    this.#onInputChange();
  }

  addOption(value, label, group = null) {
    this.#scrollBox.addOption(value, label, group);

    this.#onSearchChange();
    this.#onInputChange();
  }

  removeOption(value, label) {
    this.#scrollBox.removeOption(value, label);

    this.#onSearchChange();
    this.#onInputChange();
  }

  #toggleDropdown() {
    if (this.#dropdown.checkVisibility()) {
      this.#closeDropdown(true);
    } else {
      this.#openDropdown();
    }
  }

  #openDropdown() {
    if (this.#disabled) {
      return;
    }

    this.#dropdown.style.display = '';
    this.#search.focus();
    this.#scrollBox.setScrollTop(0);
  }

  #closeDropdown(focus) {
    this.#dropdown.style.display = 'none';

    if (focus) {
      this.#select.focus();
    }
  }

  #onSearchChange() {
    const value = this.#search.getValue().toLowerCase();

    this.#scrollBox.filter(value);
  }

  #onInputChange() {
    const checked = this.#scrollBox.getChecked();

    this.#select.render(checked);
  }
}

// NOTE: I tried to extend HTMLSelectElement
// but I could not override the validity.
// Also doing el.disabled = true didn't work as expected.
class SelectUXElement extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this.internals_ = this.attachInternals();
  }
}

window.customElements.define('select-ux', SelectUXElement);

class SelectUXSelect {
  #el;
  #placeholder;
  #values;
  #valueClassName;
  #required;
  #disabled;

  constructor({
    htmlSelectElement,
    placeholderClassName,
    placeholder,
    valuesClassName,
    valueClassName,
  }) {
    this.#el = document.createElement('select-ux');
    this.#el.id = htmlSelectElement.id;
    this.#el.className = htmlSelectElement.className;
    this.#el.tabIndex = 0;
    this.#el.style.setProperty('position', 'relative', 'important');

    this.#el.addEventListener('click', (e) => {
      e.preventDefault();

      this.#dispatchEvent('select-ux:select:toggle');
    });

    this.#el.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();

        this.#dispatchEvent('select-ux:select:open');
      } else if ('Escape' === e.code) {
        this.#dispatchEvent('select-ux:select:close');
      }
    });

    this.#el.addEventListener('focus', (e) => {
      if (this.#disabled) {
        this.#el.blur();
      }
    });

    this.#placeholder = document.createElement('div');
    this.#placeholder.className = placeholderClassName;
    this.#placeholder.textContent = placeholder;

    this.#el.appendChild(this.#placeholder);

    this.#values = document.createElement('div');
    this.#values.className = valuesClassName;

    this.#el.appendChild(this.#values);

    this.#valueClassName = valueClassName;

    this.setRequired(htmlSelectElement.required);
    this.setDisabled(htmlSelectElement.disabled);
  }

  setDisabled(disabled) {
    this.#disabled = disabled;

    this.#el.toggleAttribute('disabled', disabled);
    this.#el.tabIndex = disabled ? -1 : 0;

    this.#values.querySelectorAll('button').forEach((button) => {
      button.disabled = disabled;
    });
  }

  setRequired(required) {
    this.#required = required;
    this.#setValidity();
  }

  getEl() {
    return this.#el;
  }

  focus() {
    this.#el.focus();
  }

  render(selectUXOptions) {
    this.#placeholder.style.display = selectUXOptions.length ? 'none' : '';

    this.#values.innerHTML = '';

    selectUXOptions.forEach((selectUXOption) => {
      this.#addValue(selectUXOption);
    });

    this.#setValidity();
  }

  #addValue(selectUXOption) {
    const value = document.createElement('button');
    value.type = 'button';
    value.title = 'Remove option';
    value.className = this.#valueClassName;
    value.textContent = selectUXOption.getLabel();
    value.disabled = this.#disabled;

    value.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (this.#disabled) {
        return;
      }

      selectUXOption.setChecked(false);
    });

    value.addEventListener('keydown', (e) => {
      if ('Space' === e.code || 'Enter' === e.code) {
        e.stopPropagation();
        e.preventDefault();

        if (this.#disabled) {
          return;
        }

        selectUXOption.setChecked(false);
      }
    });

    this.#values.appendChild(value);
  }

  #setValidity() {
    const valueMissing = this.#required ? !this.#values.innerHTML : false;

    this.#el.internals_.setValidity(
      { valueMissing: valueMissing },
      'Please select an item in the list.',
    );
  }

  #dispatchEvent(eventType) {
    const event = new Event(eventType, {
      bubbles: true,
    });

    this.#el.dispatchEvent(event);
  }
}

class SelectUXSearch {
  #el;

  constructor({ className, placeholder }) {
    this.#el = document.createElement('input');
    this.#el.type = 'search';
    this.#el.className = className;
    this.#el.placeholder = placeholder;

    this.#el.addEventListener('input', () => {
      this.#dispatchEvent();
    });

    this.#el.addEventListener('change', () => {
      this.#dispatchEvent();
    });
  }

  getEl() {
    return this.#el;
  }

  focus() {
    this.#el.focus();
  }

  getValue() {
    return this.#el.value;
  }

  #dispatchEvent() {
    const event = new Event('select-ux:search:change', {
      bubbles: true,
    });

    this.#el.dispatchEvent(event);
  }
}

class SelectUXScrollBox {
  #el;
  #emptyMessage;
  #selectUXOptions = [];
  #selectUXGroups = [];
  #optionClassName;
  #optionInputClassName;
  #optionLabelClassName;
  #groupClassName;
  #groupHeadingClassName;
  #groupHeadingLevel;
  #selectId;
  #selectName;
  #selectMultiple;

  constructor({
    htmlSelectElement,
    className,
    emptyMessageClassName,
    emptyMessage,
    optionClassName,
    optionInputClassName,
    optionLabelClassName,
    groupClassName,
    groupHeadingClassName,
    groupHeadingLevel,
  }) {
    this.#selectId = htmlSelectElement.id;
    this.#selectName = htmlSelectElement.name;
    this.#selectMultiple = htmlSelectElement.multiple;

    this.#el = document.createElement('div');
    this.#el.className = className;

    this.#emptyMessage = document.createElement('div');
    this.#emptyMessage.className = emptyMessageClassName;
    this.#emptyMessage.textContent = emptyMessage;
    this.#emptyMessage.style.display = 'none';

    this.#el.appendChild(this.#emptyMessage);

    this.#optionClassName = optionClassName;
    this.#optionInputClassName = optionInputClassName;
    this.#optionLabelClassName = optionLabelClassName;
    this.#groupClassName = groupClassName;
    this.#groupHeadingClassName = groupHeadingClassName;
    this.#groupHeadingLevel = groupHeadingLevel;

    for (let i = 0; i < htmlSelectElement.children.length; i++) {
      const child = htmlSelectElement.children.item(i);

      if (child instanceof HTMLOptionElement) {
        this.#addOption(child);
      } else if (child instanceof HTMLOptGroupElement) {
        this.#addGroup(child);
      }
    }

    this.#el.addEventListener('select-ux:option:navigate', (e) => {
      const inputs = this.#el.querySelectorAll('input');

      const visible = [];

      inputs.forEach((input) => {
        if (input.checkVisibility()) {
          visible.push(input);
        }
      });

      if ('next' === e.detail.direction) {
        visible.reverse();
      }

      let previous = null;

      for (let i = 0; i < visible.length; i++) {
        if (visible[i] === e.detail.input) {
          break;
        }

        previous = visible[i];
      }

      if (previous) {
        previous.focus();
      }
    });
  }

  getEl() {
    return this.#el;
  }

  setScrollTop(scrollTop) {
    this.#el.scrollTop = scrollTop;
  }

  filter(value) {
    let anyVisible = false;

    this.#selectUXOptions.forEach(function (selectUXOption) {
      anyVisible |= selectUXOption.filter(value);
    });

    this.#selectUXGroups.forEach(function (selectUXGroup) {
      anyVisible |= selectUXGroup.filter(value);
    });

    this.#emptyMessage.style.display = anyVisible ? 'none' : '';
  }

  getChecked() {
    const checked = [];

    this.#selectUXOptions.forEach(function (selectUXOption) {
      if (selectUXOption.getChecked()) {
        checked.push(selectUXOption);
      }
    });

    this.#selectUXGroups.forEach(function (selectUXGroup) {
      selectUXGroup.getChecked().forEach(function (selectUXOption) {
        checked.push(selectUXOption);
      });
    });

    return checked;
  }

  getValue() {
    const checked = this.getChecked();

    if (this.#selectMultiple) {
      const value = [];

      checked.forEach((selectUXOption) => {
        value.push(selectUXOption.getValue());
      });

      return value;
    } else {
      return checked.length ? checked[0].getValue() : '';
    }
  }

  setValue(value) {
    this.#selectUXOptions.forEach(function (selectUXOption) {
      selectUXOption.setChecked(selectUXOption.isValue(value));
    });

    this.#selectUXGroups.forEach(function (selectUXGroup) {
      selectUXGroup.getOptions().forEach(function (selectUXOption) {
        selectUXOption.setChecked(selectUXOption.isValue(value));
      });
    });
  }

  clearOptions() {
    this.#selectUXOptions.forEach(function (selectUXOption) {
      selectUXOption.getEl().remove();
    });

    this.#selectUXGroups.forEach(function (selectUXGroup) {
      selectUXGroup.clearOptions();

      selectUXGroup.getEl().remove();
    });

    this.#selectUXOptions = [];
    this.#selectUXGroups = [];
  }

  addOption(value, label, group = null) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;

    if (group) {
      let groupFound = false;

      for (let i = 0; i < this.#selectUXGroups.length; i++) {
        const selectUXGroup = this.#selectUXGroups[i];

        if (selectUXGroup.getLabel() === group) {
          groupFound = true;

          selectUXGroup.addOption(option);

          break;
        }
      }

      if (!groupFound) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group;

        optgroup.appendChild(option);

        this.#addGroup(optgroup);
      }
    } else {
      this.#addOption(option);
    }
  }

  removeOption(value) {
    const keepOptions = [];

    this.#selectUXOptions.forEach(function (selectUXOption) {
      if (selectUXOption.isValue(value)) {
        selectUXOption.getEl().remove();
      } else {
        keepOptions.push(selectUXOption);
      }
    });

    this.#selectUXOptions = keepOptions;

    this.#selectUXGroups.forEach(function (selectUXGroup) {
      selectUXGroup.removeOption(value);
    });
  }

  #addOption(option) {
    const selectUXOption = new SelectUXOption({
      option: option,
      className: this.#optionClassName,
      inputClassName: this.#optionInputClassName,
      labelClassName: this.#optionLabelClassName,
      selectId: this.#selectId,
      selectName: this.#selectName,
      selectMultiple: this.#selectMultiple,
    });

    this.#el.appendChild(selectUXOption.getEl());

    this.#selectUXOptions.push(selectUXOption);
  }

  #addGroup(optgroup) {
    const selectUXGroup = new SelectUXGroup({
      optgroup: optgroup,
      headingLevel: this.#groupHeadingLevel,
      className: this.#groupClassName,
      headingClassName: this.#groupHeadingClassName,
      optionClassName: this.#optionClassName,
      optionInputClassName: this.#optionInputClassName,
      optionLabelClassName: this.#optionLabelClassName,
      selectId: this.#selectId,
      selectName: this.#selectName,
      selectMultiple: this.#selectMultiple,
    });

    this.#el.appendChild(selectUXGroup.getEl());

    this.#selectUXGroups.push(selectUXGroup);
  }
}

class SelectUXOption {
  #el;
  #input;
  #label;

  static #count = 0;

  constructor({
    option,
    className,
    inputClassName,
    labelClassName,
    selectId,
    selectName,
    selectMultiple,
  }) {
    if (!(option instanceof HTMLOptionElement)) {
      throw new Error('You must provide an <option> element.');
    }

    this.#el = document.createElement('div');
    this.#el.className = className;

    let ariaLabel = option.textContent;

    if (option.parentNode instanceof HTMLOptGroupElement) {
      ariaLabel = `${option.parentNode.label}: ${ariaLabel}`;
    }

    this.#input = document.createElement('input');
    this.#input.id = selectId + '_' + SelectUXOption.#count++;
    this.#input.ariaLabel = ariaLabel;
    this.#input.value = option.value;
    this.#input.name = selectName;
    this.#input.checked = option.selected;
    this.#input.className = inputClassName;

    if (selectMultiple) {
      this.#input.type = 'checkbox';
    } else {
      this.#input.type = 'radio';
    }

    this.#input.addEventListener('change', () => {
      this.#dispatchEvent('select-ux:option:change');
    });

    this.#input.addEventListener('keydown', (e) => {
      const isArrowUp = 'ArrowUp' === e.code;
      const isArrowDown = 'ArrowDown' === e.code;

      // NOTE: default behaviour for up/down in an array of radios
      // is to simultaneously navigate and select
      if (selectMultiple && (isArrowUp || isArrowDown)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        this.#dispatchEvent('select-ux:option:navigate', {
          input: this.#input,
          direction: isArrowUp ? 'previous' : 'next',
        });
      } else if ('Escape' === e.code) {
        this.#dispatchEvent('select-ux:option:escape');
      } else if ('Enter' === e.code) {
        e.preventDefault();
        e.stopImmediatePropagation();

        this.setChecked(!this.#input.checked);
      }
    });

    this.#label = document.createElement('label');
    this.#label.textContent = option.textContent;
    this.#label.className = labelClassName;
    this.#label.setAttribute('for', this.#input.id);

    this.#el.appendChild(this.#input);
    this.#el.appendChild(this.#label);
  }

  getEl() {
    return this.#el;
  }

  isValue(value) {
    return Array.isArray(value)
      ? value.includes(this.#input.value)
      : value === this.#input.value;
  }

  getValue() {
    return this.#input.value;
  }

  getLabel() {
    return this.#label.textContent;
  }

  getChecked() {
    return this.#input.checked;
  }

  setChecked(checked) {
    this.#input.checked = checked;

    this.#dispatchEvent('select-ux:option:change');
  }

  filter(value) {
    const show = this.#label.textContent.toLowerCase().includes(value);

    this.#el.style.display = show ? '' : 'none';

    return show;
  }

  #dispatchEvent(eventType, detail = {}) {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      detail: detail,
    });

    this.#el.dispatchEvent(event);
  }
}

class SelectUXGroup {
  #el;
  #heading;
  #selectUXOptions = [];
  #optionClassName;
  #optionInputClassName;
  #optionLabelClassName;
  #selectId;
  #selectName;
  #selectMultiple;

  constructor({
    optgroup,
    headingLevel,
    className,
    headingClassName,
    optionClassName,
    optionInputClassName,
    optionLabelClassName,
    selectId,
    selectName,
    selectMultiple,
  }) {
    if (!(optgroup instanceof HTMLOptGroupElement)) {
      throw new Error('You must provide an <optgroup> element.');
    }

    this.#selectId = selectId;
    this.#selectName = selectName;
    this.#selectMultiple = selectMultiple;

    this.#el = document.createElement('div');
    this.#el.className = className;

    this.#heading = document.createElement('div');
    this.#heading.className = headingClassName;
    this.#heading.role = 'heading';
    this.#heading.ariaLevel = headingLevel;
    this.#heading.textContent = optgroup.label;

    this.#el.appendChild(this.#heading);

    this.#optionClassName = optionClassName;
    this.#optionInputClassName = optionInputClassName;
    this.#optionLabelClassName = optionLabelClassName;

    for (let i = 0; i < optgroup.children.length; i++) {
      const option = optgroup.children.item(i);

      this.addOption(option);
    }
  }

  getEl() {
    return this.#el;
  }

  getLabel() {
    return this.#heading.textContent;
  }

  getOptions() {
    return this.#selectUXOptions;
  }

  getChecked() {
    const checked = [];

    this.#selectUXOptions.forEach(function (selectUXOption) {
      if (selectUXOption.getChecked()) {
        checked.push(selectUXOption);
      }
    });

    return checked;
  }

  filter(value) {
    let anyVisible = false;

    this.#selectUXOptions.forEach(function (selectUXOption) {
      anyVisible |= selectUXOption.filter(value);
    });

    this.#el.style.display = anyVisible ? '' : 'none';

    return anyVisible;
  }

  clearOptions() {
    this.#selectUXOptions.forEach(function (selectUXOption) {
      selectUXOption.getEl().remove();
    });

    this.#selectUXOptions = [];
  }

  addOption(option) {
    const selectUXOption = new SelectUXOption({
      option: option,
      className: this.#optionClassName,
      inputClassName: this.#optionInputClassName,
      labelClassName: this.#optionLabelClassName,
      selectId: this.#selectId,
      selectName: this.#selectName,
      selectMultiple: this.#selectMultiple,
    });

    this.#el.appendChild(selectUXOption.getEl());

    this.#selectUXOptions.push(selectUXOption);
  }

  removeOption(value) {
    const keepOptions = [];

    this.#selectUXOptions.forEach(function (selectUXOption) {
      if (selectUXOption.isValue(value)) {
        selectUXOption.getEl().remove();
      } else {
        keepOptions.push(selectUXOption);
      }
    });

    this.#selectUXOptions = keepOptions;
  }
}
