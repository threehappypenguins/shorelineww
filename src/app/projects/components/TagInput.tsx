'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  fetchSuggestions?: (query: string) => Promise<string[]>;
  className?: string;
  id?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Add tags (comma or click outside)',
  suggestions: staticSuggestions,
  fetchSuggestions,
  className = '',
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeTag = (s: string) => s.trim().toLowerCase();
  const tagsLower = value.map(normalizeTag);

  const filteredSuggestions = suggestions.filter(
    (s) => !tagsLower.includes(normalizeTag(s)) && normalizeTag(s) !== normalizeTag(inputValue)
  );

  const loadSuggestions = useCallback(
    async (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        setSuggestions(staticSuggestions ?? []);
        return;
      }
      if (fetchSuggestions) {
        try {
          const fetched = await fetchSuggestions(q);
          setSuggestions(fetched);
        } catch {
          setSuggestions(staticSuggestions?.filter((s) => normalizeTag(s).includes(q)) ?? []);
        }
      } else {
        setSuggestions(
          staticSuggestions?.filter((s) => normalizeTag(s).includes(q)) ?? []
        );
      }
    },
    [fetchSuggestions, staticSuggestions]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      const tid = setTimeout(() => {
        setSuggestions(staticSuggestions ?? []);
        setShowSuggestions(false);
      }, 0);
      return () => clearTimeout(tid);
    }
    debounceRef.current = setTimeout(() => {
      loadSuggestions(inputValue);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, loadSuggestions, staticSuggestions]);

  const commitTag = useCallback(
    (tag: string) => {
      const t = tag.trim();
      if (!t) return;
      const norm = normalizeTag(t);
      if (value.map((x) => x.trim().toLowerCase()).includes(norm)) return;
      const display = t
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      onChange([...value, display]);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [value, onChange]
  );

  const commitCurrentInput = useCallback(() => {
    if (inputValue.trim()) {
      commitTag(inputValue);
    }
  }, [inputValue, commitTag]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitCurrentInput();
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commitCurrentInput]);

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        commitTag(filteredSuggestions[highlightedIndex]);
        return;
      }
      commitCurrentInput();
      return;
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i < filteredSuggestions.length - 1 ? i + 1 : i
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
      return;
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    commitCurrentInput();
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="flex flex-wrap gap-2 px-4 py-2 min-h-10.5 border border-input bg-background text-foreground rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/15 text-foreground text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="hover:bg-primary/30 rounded p-0.5 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          id={id}
          aria-label="Add tags"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-30 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg py-1"
          role="listbox"
          aria-label="Tag suggestions"
        >
          {filteredSuggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`px-4 py-2 cursor-pointer text-sm ${
                i === highlightedIndex ? 'bg-primary/20' : 'hover:bg-muted'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                commitTag(s);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
