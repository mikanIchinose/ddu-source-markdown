# ddu-source-markdown

markdown header source for ddu.vim

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddu.vim

https://github.com/Shougo/ddu.vim

### ddu-kind-file

https://github.com/Shougo/ddu-kind-file

## Configuration

```vim
call ddu#custom#patch_global({
    \   'sourceOptions' : {
    \     'markdown' : {
    \       'sorters': [],
    \     },
    \   },
    \   'sourceParams' : {
    \     'markdown' : {
    \       'style': 'none',
    \       'chunkSize': 5,
    \       'limit': 1000,
    \     },
    \   },
    \ })

" start ddu
call ddu#start({'sources': [{'name': 'markdown'}], 'ui': 'filer'})
