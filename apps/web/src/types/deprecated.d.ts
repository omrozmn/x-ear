/**
 * TypeScript declarations for deprecated raw HTML elements
 * This provides IDE warnings without breaking compilation
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * @deprecated Use Button component from @x-ear/ui-web instead of raw <button> elements.
       * Add data-allow-raw="true" attribute if raw button is intentional.
       * 
       * @example
       * // ❌ Deprecated
       * <button onClick={handleClick}>Click me</button>
       * 
       * // ✅ Recommended  
       * <Button variant="primary" onClick={handleClick}>Click me</Button>
       * 
       * // ✅ Escape hatch (if really needed)
       * <button data-allow-raw="true" onClick={handleClick}>Click me</button>
       */
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
        'data-allow-raw'?: string;
      };

      /**
       * @deprecated Use Input component from @x-ear/ui-web instead of raw <input> elements.
       * Add data-allow-raw="true" attribute if raw input is intentional.
       * 
       * @example
       * // ❌ Deprecated
       * <input type="text" value={value} onChange={handleChange} />
       * 
       * // ✅ Recommended
       * <Input type="text" value={value} onChange={handleChange} />
       * 
       * // ✅ Escape hatch (if really needed)
       * <input data-allow-raw="true" type="text" value={value} onChange={handleChange} />
       */
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
        'data-allow-raw'?: string;
      };

      /**
       * @deprecated Use Select component from @x-ear/ui-web instead of raw <select> elements.
       * Add data-allow-raw="true" attribute if raw select is intentional.
       * 
       * @example
       * // ❌ Deprecated
       * <select value={value} onChange={handleChange}>
       *   <option value="1">Option 1</option>
       * </select>
       * 
       * // ✅ Recommended
       * <Select value={value} onValueChange={handleChange}>
       *   <SelectItem value="1">Option 1</SelectItem>
       * </Select>
       * 
       * // ✅ Escape hatch (if really needed)
       * <select data-allow-raw="true" value={value} onChange={handleChange}>
       *   <option value="1">Option 1</option>
       * </select>
       */
      select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
        'data-allow-raw'?: string;
      };

      /**
       * @deprecated Use Textarea component from @x-ear/ui-web instead of raw <textarea> elements.
       * Add data-allow-raw="true" attribute if raw textarea is intentional.
       * 
       * @example
       * // ❌ Deprecated
       * <textarea value={value} onChange={handleChange} />
       * 
       * // ✅ Recommended
       * <Textarea value={value} onChange={handleChange} />
       * 
       * // ✅ Escape hatch (if really needed)
       * <textarea data-allow-raw="true" value={value} onChange={handleChange} />
       */
      textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> & {
        'data-allow-raw'?: string;
      };
    }
  }
}

export {};