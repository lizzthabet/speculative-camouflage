import { Pattern } from "./types";
import { DEFAULT_RESOLUTION } from "./constants";
import { inchesToPixels } from "./helpers";
import { NoisePattern, ShapeDisruptivePattern } from "./state";

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
  type: InputType;
}

interface FormFieldsetConfig extends HtmlElementConfig {
  fieldsetClassName?: string;
  htmlElement: typeof FIELDSET;
  options?: FormInputConfig[]
}

interface ButtonConfig extends HtmlElementConfig {
  buttonClassName?: string;
  htmlElement: typeof BUTTON;
  type: typeof SUBMIT | typeof BUTTON;
  clickListener?: (event: Event) => void
}

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

// TODO: Consider deleting this configuration if it isn't used
export const CREATE_PATTERN_FORM: FormConfig = {
  heading: {
    id: CreatePatternElements.Heading,
    text: 'Generate a pattern',
    htmlElement: 'h2',
  },
  id: CreatePatternElements.Form,
  controls: [
    {
      id: CreatePatternElements.ImageUpload,
      htmlElement: INPUT,
      text: 'Upload a source image',
      type: InputType.File,
    },
    {
      id: CreatePatternElements.PaletteSize,
      defaultValue: 8,
      htmlElement: INPUT,
      inputMin: 2,
      inputMax: 32,
      text: 'Color palette size',
      type: InputType.Number,
    },
    {
      id: CreatePatternElements.PatternWidth,
      defaultValue: 8,
      htmlElement: INPUT,
      inputMin: 1,
      inputMax: 60,
      text: 'Pattern width (inches)',
      type: InputType.Number,
    },
    {
      id: CreatePatternElements.PatternHeight,
      defaultValue: 8,
      htmlElement: INPUT,
      inputMin: 1,
      inputMax: 60,
      text: 'Pattern height (inches)',
      type: InputType.Number,
    },
    {
      id: CreatePatternElements.PatternType,
      htmlElement: FIELDSET,
      text: 'Choose patterns',
      options: [
        { id: Pattern.SHAPE, text: 'Shape disruptive', htmlElement: INPUT, type: InputType.Checkbox },
        { id: Pattern.NOISE, text: 'Noise', htmlElement: INPUT, type: InputType.Checkbox }
      ],
      type: InputType.Checkbox,
    },
    {
      id: CreatePatternElements.SubmitButton,
      type: SUBMIT,
      htmlElement: BUTTON,
      text: 'Create pattern',
    }
  ],
}

enum EditShapeControls {
  Colors = 'randomize-colors',
  NumShapes = 'number-of-shapes',
  PaletteSize = 'shape-color-palette-size',
  PatternHeight = 'shape-pattern-height',
  PatternWidth = 'shape-pattern-width',
  Shapes = 'randomize-shapes',
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

const EDIT_SHAPE_PALETTE_SIZE_FORM: FormConfig = {
  id: `${EditShapeControls.PaletteSize}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      id: EditShapeControls.PaletteSize,
      htmlElement: INPUT,
      className: 'inline-input',
      text: 'Color palette size',
      labelClassName: 'inline-label',
      type: InputType.Number,
      inputMax: 32,
      inputMin: 2,
      inputStep: 1,
    },
    {
      id: `${EditShapeControls.PaletteSize}-submit`,
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      text: 'Refresh',
      type: SUBMIT
    },
  ]
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
      text: 'Refresh',
      type: SUBMIT
    },
  ]
}

const EDIT_SHAPE_PATTERN_SIZE_FORM: FormConfig = {
  id: 'shape-pattern-size-form',
  controls: [
    {
      id: 'shape-pattern-size-dimensions',
      text: 'Pattern dimensions (inches)',
      htmlElement: FIELDSET,
      fieldsetClassName: 'inline-fieldset',
      options: [
        {
          id: EditShapeControls.PatternWidth,
          className: 'inline-input',
          htmlElement: INPUT,
          text: 'width',
          labelClassName: 'inline-label-wrapper',
          type: InputType.Number,
          inputMax: 32,
          inputMin: 1,
          inputStep: 0.25,
        },
        {
          id: EditShapeControls.PatternHeight,
          className: 'inline-input',
          htmlElement: INPUT,
          text: 'height',
          labelClassName: 'inline-label-wrapper',
          type: InputType.Number,
          inputMax: 32,
          inputMin: 1,
          inputStep: 0.25,
        },
      ]
    },
    {
      id: 'shape-pattern-size-submit',
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      text: 'Refresh',
      type: SUBMIT
    },
  ]
}

export function createShapePatternEditForms(pattern: ShapeDisruptivePattern) {
  const wrapper = document.createElement('figure')
  const heading = document.createElement('h4')
  heading.innerText = 'Adjust shape disruptive pattern'
  wrapper.appendChild(heading)

  const regenerateColorsForm = createForm(EDIT_SHAPE_COLORS_FORM, (e) => {
    e.preventDefault()
    pattern.regenerateColors()
  })

  const regenerateSitesForm = createForm(EDIT_SHAPE_SHAPES_FORM, (e) => {
    e.preventDefault()
    pattern.regenerateSites()
  })

  const paletteSizeForm = createForm(EDIT_SHAPE_PALETTE_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const paletteSizeInput = formElements.namedItem(EditShapeControls.PaletteSize) as HTMLInputElement
    pattern.regeneratePalette(parseInt(paletteSizeInput.value))
  })

  const numShapesForm = createForm(EDIT_SHAPE_NUM_SHAPES_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const numShapesInput = formElements.namedItem(EditShapeControls.NumShapes) as HTMLInputElement
    pattern.setSites(parseInt(numShapesInput.value))
  })

  const patternSizeForm = createForm(EDIT_SHAPE_PATTERN_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const widthInput = formElements.namedItem(EditShapeControls.PatternWidth) as HTMLInputElement
    const heightInput = formElements.namedItem(EditShapeControls.PatternHeight) as HTMLInputElement
    pattern.setDimensions({
      width: inchesToPixels(parseInt(widthInput.value), DEFAULT_RESOLUTION),
      height: inchesToPixels(parseInt(heightInput.value), DEFAULT_RESOLUTION)
    })
  })

  wrapper.appendChild(regenerateColorsForm)
  wrapper.appendChild(regenerateSitesForm)
  wrapper.appendChild(numShapesForm)
  wrapper.appendChild(paletteSizeForm)
  wrapper.appendChild(patternSizeForm)

  return wrapper
}

enum EditNoiseControls {
  PaletteSize = 'noise-color-palette-size',
  PatternHeight = 'noise-pattern-height',
  PatternWidth = 'noise-pattern-width',
  Seed = 'noise-seed',
}

const EDIT_NOISE_PALETTE_SIZE_FORM: FormConfig = {
  id: `${EditNoiseControls.PaletteSize}-form`,
  formClassName: 'inline-form',
  controls: [
    {
      id: EditNoiseControls.PaletteSize,
      htmlElement: INPUT,
      className: 'inline-input',
      text: 'Color palette size',
      labelClassName: 'inline-label',
      type: InputType.Number,
      inputMin: 2,
      inputMax: 32,
      inputStep: 1,
    },
    {
      id: `${EditNoiseControls.PaletteSize}-submit`,
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      type: SUBMIT,
      text: 'Refresh'
    }
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
      id: `${EditNoiseControls.Seed}-submit`,
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      type: SUBMIT,
      text: 'Refresh'
    }
  ]
}

const EDIT_NOISE_PATTERN_SIZE_FORM: FormConfig = {
  id: 'noise-pattern-size-form',
  formClassName: 'inline-form',
  controls: [
    {
      id: 'noise-pattern-size-dimensions',
      text: 'Pattern dimensions (inches)',
      htmlElement: FIELDSET,
      fieldsetClassName: 'inline-fieldset',
      options: [
        {
          id: EditNoiseControls.PatternWidth,
          className: 'inline-input',
          htmlElement: INPUT,
          text: 'width',
          labelClassName: 'inline-label-wrapper',
          type: InputType.Number,
          inputMax: 32,
          inputMin: 1,
          inputStep: 0.25,
        },
        {
          id: EditNoiseControls.PatternHeight,
          className: 'inline-input',
          htmlElement: INPUT,
          text: 'height',
          labelClassName: 'inline-label-wrapper',
          type: InputType.Number,
          inputMax: 32,
          inputMin: 1,
          inputStep: 0.25,
        },
      ]
    },
    {
      id: 'noise-pattern-size-submit',
      buttonClassName: 'inline-button',
      htmlElement: BUTTON,
      text: 'Refresh',
      type: SUBMIT
    },
  ]
}

export function createNoisePatternEditForm (pattern: NoisePattern) {
  const wrapper = document.createElement('figure')
  const heading = document.createElement('h4')
  heading.innerText = 'Adjust noise pattern'
  wrapper.appendChild(heading)

  const paletteSizeForm = createForm(EDIT_NOISE_PALETTE_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const paletteSizeInput = formElements.namedItem(EditNoiseControls.PaletteSize) as HTMLInputElement
    pattern.regeneratePalette(parseInt(paletteSizeInput.value))
  })

  const noiseSeedForm = createForm(EDIT_NOISE_SEED_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const seedInput = formElements.namedItem(EditNoiseControls.Seed) as HTMLInputElement
    pattern.setNoiseSeed(parseInt(seedInput.value))
  })

  const patternSizeForm = createForm(EDIT_NOISE_PATTERN_SIZE_FORM, (e) => {
    e.preventDefault()
    const formElements = (e.target as HTMLFormElement).elements
    const widthInput = formElements.namedItem(EditNoiseControls.PatternWidth) as HTMLInputElement
    const heightInput = formElements.namedItem(EditNoiseControls.PatternHeight) as HTMLInputElement
    pattern.setDimensions({
      width: inchesToPixels(parseInt(widthInput.value), DEFAULT_RESOLUTION),
      height: inchesToPixels(parseInt(heightInput.value), DEFAULT_RESOLUTION)
    })
  })

  wrapper.appendChild(noiseSeedForm)
  wrapper.appendChild(paletteSizeForm)
  wrapper.appendChild(patternSizeForm)

  return wrapper
}

function createInput(config: FormInputConfig) {
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

  return { label, input }
}

function createFieldset(config: FormFieldsetConfig) {
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
      const { label, input } = createInput(inputConfig)
      // Nest the input element in the label element for styling
      label.prepend(input)
      fieldset.appendChild(label)
    })
  }

  return { fieldset }
}

function createButton(config: ButtonConfig) {
  const button: HTMLButtonElement = document.createElement(BUTTON)
  button.id = config.id
  button.textContent = config.text
  button.type = config.type

  if (config.buttonClassName) {
    button.classList.add(config.buttonClassName)
  }

  if (config.clickListener) {
    button.addEventListener('click', config.clickListener)
  }

  return { button }
}

export function createForm(formConfig: FormConfig, submitListener: (e: Event) => void) {
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
        const { label, input } = createInput(element as FormInputConfig)
        form.appendChild(label)
        form.appendChild(input)
        break
      case FIELDSET:
        const { fieldset } = createFieldset(element as FormFieldsetConfig)
        form.appendChild(fieldset)
        break
      case BUTTON:
        const { button } = createButton(element)
        form.appendChild(button)
        break
    }
  })

  if (submitListener) {
    form.addEventListener('submit', submitListener)
  }

  return form
}
