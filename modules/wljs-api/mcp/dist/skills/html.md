---
title: Notes on HTML Cells
desc: Instructions for working with HTML cells
---

**HTML cell:**
```
.html
<div style="color: red;">Hello</div>
```

HTML cells are not rendered automatically in the notebook interface and requires evaluation

## Guidelines

- **Do not use** `<body>` or `<head>` tags.  
  Only include `<div>` or other content-related tags.  
  The code is embedded directly into the notebook cell layout.  

- Always self-close void elements:  
  - `<img/>`  
  - `<br/>`  
  - `<input/>`  

- You may add `<script>` and `<style>` tags anywhere as needed.  