class SelectUX {
  #el;
  #select;
  #dropdown;
  #search;
  #options;

  constructor({
    htmlSelectElement,
    className = 'select-ux',
    selectClassName = 'select-ux__select',
    selectPlaceholderClassName = 'select-ux__select__placeholder',
    selectPlaceholder = 'Choose an option',
    selectValuesClassName = 'select-ux__select__values',
    selectValueClassName = 'select-ux__select__value',
    dropdownClassName = 'select-ux__dropdown',
    searchClassName = 'select-ux__search',
    searchPlaceholder = 'Search options...',
    optionsClassName = 'select-ux__options',
    optionsEmptyMessageClassName = 'select-ux__options__empty',
    optionsEmptyMessage = 'No options found.',
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

    this.#el = document.createElement('div');
    this.#el.id = htmlSelectElement.id;
    this.#el.className = className;
    this.#el.style.setProperty('position', 'relative', 'important');

    this.#select = new SelectUXSelect({
      className: selectClassName,
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

    this.#el.appendChild(this.#dropdown);

    this.#search = new SelectUXSearch({
      className: searchClassName,
      placeholder: searchPlaceholder,
    });

    this.#dropdown.appendChild(this.#search.getEl());

    this.#options = new SelectUXOptions({
      htmlSelectElement,
      className: optionsClassName,
      emptyMessageClassName: optionsEmptyMessageClassName,
      emptyMessage: optionsEmptyMessage,
      optionClassName,
      optionInputClassName,
      optionLabelClassName,
      groupClassName,
      groupHeadingClassName,
      groupHeadingLevel,
    });

    this.#dropdown.appendChild(this.#options.getEl());

    htmlSelectElement.after(this.#el);

    htmlSelectElement.remove();

    this.#el.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      this.#closeDropdown(false);
    });

    // this.#el.addEventListener('focusout', (e) => {
    //   this.#closeDropdown(false);
    // });

    document.addEventListener('select-ux:interact', () => {
      this.#toggleDropdown();
    });

    document.addEventListener('select-ux:search', () => {
      this.#onSearchChange();
    });

    document.addEventListener('select-ux:change', () => {
      this.#onInputChange();
    });

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
    this.#dropdown.style.display = '';
    this.#search.focus();
  }

  #closeDropdown(focus) {
    this.#dropdown.style.display = 'none';

    if (focus) {
      this.#select.focus();
    }
  }

  #onSearchChange() {
    const value = this.#search.getValue().toLowerCase();

    this.#options.filter(value);
  }

  #onInputChange() {
    const checked = this.#options.getChecked();

    this.#select.render(checked);
  }
}

class SelectUXSelect {
  #el;
  #placeholder;
  #values;
  #valueClassName;

  static #dispatchEvent() {
    const event = new Event('select-ux:interact');

    document.dispatchEvent(event);
  }

  constructor({
    className,
    placeholderClassName,
    placeholder,
    valuesClassName,
    valueClassName,
  }) {
    this.#el = document.createElement('div');
    this.#el.className = className;
    this.#el.tabIndex = 0;

    this.#el.addEventListener('click', function (e) {
      e.preventDefault();

      SelectUXSelect.#dispatchEvent();
    });

    this.#el.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        SelectUXSelect.#dispatchEvent();
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
  }

  #addValue(selectUXOption) {
    const value = document.createElement('button');
    value.type = 'button';
    value.title = 'Remove option';
    value.className = this.#valueClassName;
    value.textContent = selectUXOption.getLabel();

    value.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();

      selectUXOption.setChecked(false);
    });

    this.#values.appendChild(value);
  }
}

class SelectUXSearch {
  #el;

  static #dispatchEvent() {
    const event = new Event('select-ux:search');

    document.dispatchEvent(event);
  }

  constructor({ className, placeholder }) {
    this.#el = document.createElement('input');
    this.#el.type = 'search';
    this.#el.className = className;
    this.#el.placeholder = placeholder;

    this.#el.addEventListener('input', () => {
      SelectUXSearch.#dispatchEvent();
    });

    this.#el.addEventListener('change', () => {
      SelectUXSearch.#dispatchEvent();
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
}

class SelectUXOptions {
  #el;
  #emptyMessage;
  #options = [];
  #groups = [];

  constructor({
    htmlSelectElement,
    groupHeadingLevel,
    className,
    emptyMessageClassName,
    emptyMessage,
    optionClassName,
    optionInputClassName,
    optionLabelClassName,
    groupClassName,
    groupHeadingClassName,
  }) {
    this.#el = document.createElement('div');
    this.#el.className = className;

    this.#emptyMessage = document.createElement('div');
    this.#emptyMessage.className = emptyMessageClassName;
    this.#emptyMessage.textContent = emptyMessage;
    this.#emptyMessage.style.display = 'none';

    this.#el.appendChild(this.#emptyMessage);

    for (let i = 0; i < htmlSelectElement.children.length; i++) {
      const child = htmlSelectElement.children.item(i);

      if ('OPTION' === child.tagName) {
        const input = new SelectUXOption({
          option: child,
          className: optionClassName,
          inputClassName: optionInputClassName,
          labelClassName: optionLabelClassName,
        });

        this.#el.appendChild(input.getEl());

        this.#options.push(input);
      } else if ('OPTGROUP' === child.tagName) {
        const group = new SelectUXGroup({
          optgroup: child,
          headingLevel: groupHeadingLevel,
          className: groupClassName,
          headingClassName: groupHeadingClassName,
          optionClassName,
          optionInputClassName,
          optionLabelClassName,
        });

        this.#el.appendChild(group.getEl());

        this.#groups.push(group);
      }
    }

    document.addEventListener('select-ux:option:navigate', (e) => {
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

  filter(value) {
    let anyVisible = false;

    this.#options.forEach(function (selectUXOption) {
      anyVisible |= selectUXOption.filter(value);
    });

    this.#groups.forEach(function (selectUXGroup) {
      anyVisible |= selectUXGroup.filter(value);
    });

    this.#emptyMessage.style.display = anyVisible ? 'none' : '';
  }

  getChecked() {
    const checked = [];

    this.#options.forEach(function (selectUXOption) {
      if (selectUXOption.getChecked()) {
        checked.push(selectUXOption);
      }
    });

    this.#groups.forEach(function (selectUXGroup) {
      selectUXGroup.getChecked().forEach(function (selectUXOption) {
        checked.push(selectUXOption);
      });
    });

    return checked;
  }
}

class SelectUXOption {
  #el;
  #input;
  #label;

  static #count = 0;

  static #dispatchEvent() {
    const event = new Event('select-ux:change');

    document.dispatchEvent(event);
  }

  constructor({ option, className, inputClassName, labelClassName }) {
    if (!(option instanceof HTMLOptionElement)) {
      throw new Error('You must provide an <option> element.');
    }

    const htmlSelectElement = option.closest('select');

    if (!(htmlSelectElement instanceof HTMLSelectElement)) {
      throw new Error('Could not find the parent <select> element.');
    }

    this.#el = document.createElement('div');
    this.#el.className = className;

    let ariaLabel = option.textContent;

    if ('OPTGROUP' === option.parentNode.tagName) {
      ariaLabel = `${option.parentNode.label}: ${ariaLabel}`;
    }

    this.#input = document.createElement('input');
    this.#input.id = htmlSelectElement.id + '_' + SelectUXOption.#count++;
    this.#input.ariaLabel = ariaLabel;
    this.#input.value = option.value;
    this.#input.name = htmlSelectElement.name;
    this.#input.checked = option.selected;
    this.#input.className = inputClassName;

    if (htmlSelectElement.multiple) {
      this.#input.type = 'checkbox';
    } else {
      this.#input.type = 'radio';
      this.#input.required = htmlSelectElement.required;
    }

    this.#input.addEventListener('change', () => {
      SelectUXOption.#dispatchEvent();
    });

    this.#input.addEventListener('keydown', (e) => {
      const isArrowUp = 'ArrowUp' === e.code;
      const isArrowDown = 'ArrowDown' === e.code;

      if (isArrowUp || isArrowDown) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const event = new CustomEvent('select-ux:option:navigate', {
          detail: {
            input: this.#input,
            direction: isArrowUp ? 'previous' : 'next',
          },
        });

        document.dispatchEvent(event);
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

  getLabel() {
    return this.#label.textContent;
  }

  getChecked() {
    return this.#input.checked;
  }

  setChecked(checked) {
    this.#input.checked = checked;

    SelectUXOption.#dispatchEvent();
  }

  filter(value) {
    const show = this.#label.textContent.toLowerCase().includes(value);

    this.#el.style.display = show ? '' : 'none';

    return show;
  }
}

class SelectUXGroup {
  #el;
  #heading;
  #options = [];

  constructor({
    optgroup,
    headingLevel,
    className,
    headingClassName,
    optionClassName,
    optionInputClassName,
    optionLabelClassName,
  }) {
    if (!(optgroup instanceof HTMLOptGroupElement)) {
      throw new Error('You must provide an <optgroup> element.');
    }

    const select = optgroup.closest('select');

    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Could not find the parent <select> element.');
    }

    this.#el = document.createElement('div');
    this.#el.className = className;

    this.#heading = document.createElement('div');
    this.#heading.className = headingClassName;
    this.#heading.role = 'heading';
    this.#heading.ariaLevel = headingLevel;
    this.#heading.textContent = optgroup.label;

    this.#el.appendChild(this.#heading);

    for (let i = 0; i < optgroup.children.length; i++) {
      const option = optgroup.children.item(i);

      const selectUXOption = new SelectUXOption({
        option: option,
        className: optionClassName,
        inputClassName: optionInputClassName,
        labelClassName: optionLabelClassName,
      });

      this.#el.appendChild(selectUXOption.getEl());

      this.#options.push(selectUXOption);
    }
  }

  getEl() {
    return this.#el;
  }

  getChecked() {
    const checked = [];

    this.#options.forEach(function (selectUXOption) {
      if (selectUXOption.getChecked()) {
        checked.push(selectUXOption);
      }
    });

    return checked;
  }

  filter(value) {
    let anyVisible = false;

    this.#options.forEach(function (selectUXOption) {
      anyVisible |= selectUXOption.filter(value);
    });

    this.#el.style.display = anyVisible ? '' : 'none';

    return anyVisible;
  }
}
