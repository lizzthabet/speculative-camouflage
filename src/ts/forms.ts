import { inchesToPixels } from "./helpers";
import { NoisePattern, ShapeDisruptivePattern } from "./state";

// Form element constants
const LABEL = 'label'
const INPUT = 'input'
const FIELDSET = 'fieldset'
const LEGEND = 'legend'
const SUBMIT = 'submit'
const BUTTON = 'button'
const FORM = 'form'
const CHECKED = 'checked'

enum InputType {
  Number = 'number',
  Text = 'text',
  Radio = 'radio',
  Checkbox = 'checkbox',
  File = 'file',
}

// Form and html interfaces
interface FormConfig {
  formClassName?: string;
  heading?: HtmlElementConfig;
  id: string;
  controls: (ButtonConfig | FormInputConfig | FormFieldsetConfig)[];
}

interface HtmlElementConfig {
  className?: string;
  id: string | null;
  htmlElement: string;
  text: string;
}

interface FormInputConfig extends HtmlElementConfig {
  defaultValue?: string | number;
  htmlElement: typeof INPUT;
  inputMin?: number;
  inputMax?: number;
  inputStep?: number;
  labelClassName?: string;
  tipText?: string;
  type: InputType;
}

interface FormFieldsetConfig extends HtmlElementConfig {
  fieldsetClassName?: string;
  htmlElement: typeof FIELDSET;
  options?: FormInputConfig[];
}

interface ButtonConfig extends HtmlElementConfig {
  buttonClassName?: string;
  htmlElement: typeof BUTTON;
  tipText?: string;
  type: typeof SUBMIT | typeof BUTTON;
  clickListener?: (event: Event) => void;
}

// Html creation functions
function createInput(config: FormInputConfig, defaultValue?: string) {
  const label: HTMLLabelElement = document.createElement(LABEL)
  label.innerText = config.text
  label.htmlFor = config.id
  if (config.labelClassName) {
    label.classList.add(config.labelClassName)
  }

  const input: HTMLInputElement = document.createElement(config.htmlElement)
  input.id = config.id
  input.type = config.type
  if (config.className) {
    input.classList.add(config.className)
  }

  const tip: HTMLParagraphElement = document.createElement('p')
  if (config.tipText) {
    tip.innerText = config.tipText
    tip.classList.add('form-tip')
    input.classList.add('input-with-tip')
  }

  if (config.type !== InputType.Checkbox) {
    input.required = true
  }

  if (config.defaultValue && config.defaultValue === CHECKED) {
    input.checked = true
  } else if (config.defaultValue) {
    input.value = String(config.defaultValue);
  }

  if (input.type === InputType.Number) {
    input.min = String(config.inputMin);
    input.max = String(config.inputMax);
    input.step = String(config.inputStep);
  } else if (input.type === InputType.File) {
    input.multiple = false
    input.accept = 'image/*'
  }

  if (defaultValue) {
    input.value = defaultValue
  }

  return { label, input, tip: config.tipText ? tip : undefined }
}

function createFieldset(config: FormFieldsetConfig, defaultValues?: { [key: string]: string }) {
  const fieldset: HTMLFieldSetElement = document.createElement(config.htmlElement)
  fieldset.id = config.id

  if (config.fieldsetClassName) {
    fieldset.classList.add(config.fieldsetClassName)
  }

  const legend: HTMLLegendElement = document.createElement(LEGEND)
  legend.innerText = config.text

  fieldset.appendChild(legend)

  if (config.options) {
    config.options.forEach(inputConfig => {
      const defaultValue = defaultValues && defaultValues[inputConfig.id] || undefined
      const { label, input } = createInput(inputConfig, defaultValue)
      // Nest the input element in the label element for styling
      label.prepend(input)
      fieldset.appendChild(label)
    })
  }

  return { fieldset }
}

export function createButton(config: ButtonConfig) {
  const button: HTMLButtonElement = document.createElement(BUTTON)
  button.id = config.id
  button.innerText = config.text
  button.type = config.type

  if (config.buttonClassName) {
    button.classList.add(config.buttonClassName)
  }

  if (config.clickListener) {
    button.addEventListener('click', config.clickListener)
    button.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        config.clickListener(event)
      }
    })
  }

  const tip: HTMLParagraphElement = document.createElement('p')
  if (config.tipText) {
    tip.innerText = config.tipText
    tip.classList.add('form-tip')
  }

  return { button, tip: config.tipText ? tip : undefined }
}

export function createForm(
  formConfig: FormConfig,
  submitListener: (e: Event) => any,
  addLoadingState: boolean,
  defaultValues?: { [key: string]: string }
) {
  const form: HTMLFormElement = document.createElement(FORM)
  form.id = formConfig.id
  form.autocomplete = 'off'

  if (formConfig.formClassName) {
    form.classList.add(formConfig.formClassName)
  }

  if (formConfig.heading) {
    const heading = document.createElement(formConfig.heading.htmlElement)
    heading.innerText = formConfig.heading.text
    heading.id = `${formConfig.id}-heading`

    form.appendChild(heading)
    form.setAttribute('aria-labelledby', heading.id)
  }

  formConfig.controls.forEach(element => {
    switch (element.htmlElement) {
      case INPUT:
        const defaultValue = defaultValues && defaultValues[element.id] || undefined
        const { label, input, tip: inputTip } = createInput(element as FormInputConfig, defaultValue)
        form.appendChild(label)
        form.appendChild(input)
        if (inputTip) {
          form.appendChild(inputTip)
        }
        break
      case FIELDSET:
        const { fieldset } = createFieldset(element as FormFieldsetConfig, defaultValues)
        form.appendChild(fieldset)
        break
      case BUTTON:
        const { button, tip: buttonTip } = createButton(element)
        form.appendChild(button)
        if (buttonTip) {
          form.appendChild(buttonTip)
        }
        break
    }
  })

  if (submitListener) {
    const submitCallback = !addLoadingState ? submitListener : (e: Event) => {
      e.preventDefault()
      const elements = (e.target as HTMLFormElement).elements
      let submitButton: HTMLButtonElement;
      for (let i = 0; i < elements.length; i++) {
        const element = elements.item(i)
        if (element.nodeName.toLowerCase() === BUTTON) {
          if ((element as HTMLButtonElement).type.toLowerCase() === SUBMIT) {
            submitButton = element as HTMLButtonElement
            break
          }
        }
      }

      const stopLoadingAnimation = beginLoadingAnimation(submitButton)
      const disabledButtons = enableOrDisableButtons({ disable: true })
      // Workaround to make sure that DOM changes are rendered before potentially costly calculations on form submit
      setTimeout(() => {
        submitListener(e)
        stopLoadingAnimation()
        enableOrDisableButtons({ buttons: disabledButtons, disable: false })
      })
    }
    form.addEventListener('submit', submitCallback)
  }

  return { form }
}

// This could be moved to another file depending on final code organization
export function enableOrDisableButtons({ buttons, disable }: { buttons?: HTMLCollectionOf<HTMLButtonElement>, disable: boolean }) {
  const buttonsToUpdate = buttons ? buttons : document.getElementsByTagName('button')

  for (let i = 0; i < buttonsToUpdate.length; i++) {
    buttonsToUpdate.item(i).disabled = !!disable
  }

  return buttonsToUpdate
}

export function beginLoadingAnimation(button: HTMLButtonElement) {
  if (!button) {
    return () => {}
  }

  const originalContent = button.innerHTML

  button.disabled = true
  button.innerHTML = `Loading<span class="loading-ellipse1">.</span><span class="loading-ellipse2">.</span><span class="loading-ellipse3">.</span>`

  return () => {
    button.innerHTML = originalContent
    button.disabled = false
  }
}

// Common form elements shared between multiple forms
const REGENERATE_BUTTON: ButtonConfig = {
  id: 'override-me',
  buttonClassName: 'inline-button',
  htmlElement: BUTTON,
  type: SUBMIT,
  text: 'Regenerate'
}

const PALETTE_SIZE_INPUT: FormInputConfig = {
  id: 'override-me',
  htmlElement: INPUT,
  className: 'inline-input',
  text: 'Color palette size',
  labelClassName: 'inline-label',
  type: InputType.Number,
  inputMin: 2,
  inputMax: 32,
  inputStep: 1,
}

const PATTERN_SIZE_FIELDSET: FormFieldsetConfig = {
  id: 'override-me',
  text: 'Pattern dimensions (inches)',
  htmlElement: FIELDSET,
  fieldsetClassName: 'inline-fieldset',
  options: []
}

const PATTERN_WIDTH_INPUT: FormInputConfig = {
  id: 'override-me',
  className: 'inline-input',
  htmlElement: INPUT,
  text: 'width',
  labelClassName: 'inline-label-wrapper',
  type: InputType.Number,
  inputMax: 50,
  inputMin: 0.25,
  inputStep: 0.25,
}

const PATTERN_HEIGHT_INPUT: FormInputConfig = {
  id: 'override-me',
  className: 'inline-input',
  htmlElement: INPUT,
  text: 'height',
  labelClassName: 'inline-label-wrapper',
  type: InputType.Number,
  inputMax: 50,
  inputMin: 0.25,
  inputStep: 0.25,
}

// Specific form configurations
export enum CreatePatternElements {
  Form = 'create-pattern-form',
  Heading = 'create-pattern-heading',
  ImageUpload = 'source-image',
  PaletteSize = 'color-palette-size',
  PatternHeight = 'pattern-height',
  PatternType = 'pattern-type',
  PatternWidth = 'pattern-width',
  SubmitButton = 'create-pattern-submit'
}

// Unique ids attached to each form element
export enum EditShapeControls {
  Colors = 'randomize-colors',
  NumShapes = 'number-of-shapes',
  PaletteSize = 'shape-color-palette-size',
  PatternHeight = 'shape-pattern-height',
  PatternWidth = 'shape-pattern-width',
  Shapes = 'randomize-shapes',
}

// Unique ids attached to each form element
export enum EditNoiseControls {
  PaletteSize = 'noise-color-palette-size',
  PatternHeight = 'noise-pattern-height',
  PatternWidth = 'noise-pattern-width',
  Seed = 'noise-seed',
}

const EDIT_SHAPE_COLORS_FORM: FormConfig = {
  id: `${EditShapeControls.Colors}-form`,
  formClassName: 'inline-form',
  controls: [{
    id: EditShapeControls.Colors,
    htmlElement: BUTTON,
    text: 'Randomize colors',
    type: SUBMIT
  }]
}

const EDIT_SHAPE_SHAPES_FORM: FormConfig = {
  id: `${EditShapeControls.Shapes}-form`,
  formClassName: 'inline-form',
  controls: [{
    id: EditShapeControls.Shapes,
    htmlElement: BUTTON,
    text: 'Randomize shapes',
    type: SUBMIT
  }]
}

const EDIT_SHAPE_NUM_SHAPES_FORM: FormConfig = {
  id: `${EditShapeControls.NumShapes}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      id: EditShapeControls.NumShapes,
      htmlElement: INPUT,
      className: 'inline-input',
      text: 'Number of shapes',
      labelClassName: 'inline-label',
      type: InputType.Number,
      inputMax: 200,
      inputMin: 2,
      inputStep: 1,
    },
    {
      id: `${EditShapeControls.NumShapes}-submit`,
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      text: 'Regenerate',
      type: SUBMIT
    },
  ]
}

const EDIT_NOISE_SEED_FORM: FormConfig = {
  id: `${EditNoiseControls.Seed}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      id: EditNoiseControls.Seed,
      htmlElement: INPUT,
      className: 'inline-input',
      text: 'Noise seed',
      labelClassName: 'inline-label',
      type: InputType.Number,
      inputMin: 1,
      inputMax: 500,
      inputStep: 1,
    },
    {
      ...REGENERATE_BUTTON,
      tipText: 'Tip: A seed value is a constant number that\'s used to generate a set of random values. Adjust the seed constant to regenerate the noise pattern.',
      id: `${EditNoiseControls.Seed}-submit`,
    }
  ]
}

const EDIT_SHAPE_PALETTE_SIZE_FORM: FormConfig = {
  id: `${EditShapeControls.PaletteSize}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      ...PALETTE_SIZE_INPUT,
      id: EditShapeControls.PaletteSize,
    },
    {
      ...REGENERATE_BUTTON,
      id: `${EditShapeControls.PaletteSize}-submit`,
    },
  ]
}

const EDIT_NOISE_PALETTE_SIZE_FORM: FormConfig = {
  id: `${EditNoiseControls.PaletteSize}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      ...PALETTE_SIZE_INPUT,
      id: EditNoiseControls.PaletteSize,
    },
    {
      ...REGENERATE_BUTTON,
      tipText: 'Tip: Larger color palettes will generate a nosie pattern with more depth, while smaller color palettes will flatten it.',
      id: `${EditNoiseControls.PaletteSize}-submit`,
    }
  ]
}

const EDIT_SHAPE_PATTERN_SIZE_FORM: FormConfig = {
  id: 'shape-pattern-size-form',
  formClassName: 'inline-form',
  controls: [
    {
      ...PATTERN_SIZE_FIELDSET,
      id: 'shape-pattern-size-dimensions',
      options: [
        {
          ...PATTERN_WIDTH_INPUT,
          id: EditShapeControls.PatternWidth,
        },
        {
          ...PATTERN_HEIGHT_INPUT,
          id: EditShapeControls.PatternHeight,
        },
      ]
    },
    {
      ...REGENERATE_BUTTON,
      id: 'shape-pattern-size-submit',
    },
  ]
}

const EDIT_NOISE_PATTERN_SIZE_FORM: FormConfig = {
  id: 'noise-pattern-size-form',
  formClassName: 'inline-form',
  controls: [
    {
      ...PATTERN_SIZE_FIELDSET,
      id: 'noise-pattern-size-dimensions',
      options: [
        {
          ...PATTERN_WIDTH_INPUT,
          id: EditNoiseControls.PatternWidth,
        },
        {
          ...PATTERN_HEIGHT_INPUT,
          id: EditNoiseControls.PatternHeight,
        },
      ]
    },
    {
      ...REGENERATE_BUTTON,
      id: 'noise-pattern-size-submit',
    },
  ]
}

export function createShapePatternEditForms(
  pattern: ShapeDisruptivePattern,
  defaultValues?: { [key in EditShapeControls]?: string }
) {
  const wrapper = document.createElement('figure')
  const heading = document.createElement('h4')
  heading.innerText = 'Adjust shape disruptive pattern'
  wrapper.appendChild(heading)

  const { form: regenerateColorsForm } = createForm(EDIT_SHAPE_COLORS_FORM, (e) => {
    e.preventDefault()
    pattern.regenerateColors()
  }, false, defaultValues)

  const { form: regenerateSitesForm } = createForm(EDIT_SHAPE_SHAPES_FORM, (e) => {
    e.preventDefault()
    pattern.regenerateSites()
  }, false, defaultValues)

  const { form: paletteSizeForm } = createForm(EDIT_SHAPE_PALETTE_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const paletteSizeInput = formElements.namedItem(EditShapeControls.PaletteSize) as HTMLInputElement
    pattern.regeneratePalette(parseInt(paletteSizeInput.value))
  }, true, defaultValues)

  const { form: numShapesForm } = createForm(EDIT_SHAPE_NUM_SHAPES_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const numShapesInput = formElements.namedItem(EditShapeControls.NumShapes) as HTMLInputElement
    pattern.setSites(parseInt(numShapesInput.value))
  }, false, defaultValues)

  const { form: patternSizeForm } = createForm(EDIT_SHAPE_PATTERN_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const widthInput = formElements.namedItem(EditShapeControls.PatternWidth) as HTMLInputElement
    const heightInput = formElements.namedItem(EditShapeControls.PatternHeight) as HTMLInputElement
    pattern.setDimensions({
      width: inchesToPixels(parseInt(widthInput.value)),
      height: inchesToPixels(parseInt(heightInput.value))
    })
  }, false, defaultValues)

  wrapper.appendChild(regenerateColorsForm)
  wrapper.appendChild(regenerateSitesForm)
  wrapper.appendChild(numShapesForm)
  wrapper.appendChild(paletteSizeForm)
  wrapper.appendChild(patternSizeForm)

  return wrapper
}

export function createNoisePatternEditForm (
  pattern: NoisePattern,
  defaultValues?: { [key in EditNoiseControls]?: string }
) {
  const wrapper = document.createElement('figure')
  const heading = document.createElement('h4')
  heading.innerText = 'Adjust noise pattern'
  wrapper.appendChild(heading)

  const { form: paletteSizeForm } = createForm(EDIT_NOISE_PALETTE_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const paletteSizeInput = formElements.namedItem(EditNoiseControls.PaletteSize) as HTMLInputElement
    pattern.regeneratePalette(parseInt(paletteSizeInput.value))
  }, true, defaultValues)

  const { form: noiseSeedForm } = createForm(EDIT_NOISE_SEED_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const seedInput = formElements.namedItem(EditNoiseControls.Seed) as HTMLInputElement
    pattern.setNoiseSeed(parseInt(seedInput.value))
  }, true, defaultValues)

  const { form: patternSizeForm } = createForm(EDIT_NOISE_PATTERN_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const widthInput = formElements.namedItem(EditNoiseControls.PatternWidth) as HTMLInputElement
    const heightInput = formElements.namedItem(EditNoiseControls.PatternHeight) as HTMLInputElement
    pattern.setDimensions({
      width: inchesToPixels(parseInt(widthInput.value)),
      height: inchesToPixels(parseInt(heightInput.value))
    })
  }, true, defaultValues)

  wrapper.appendChild(noiseSeedForm)
  wrapper.appendChild(paletteSizeForm)
  wrapper.appendChild(patternSizeForm)

  return wrapper
}
