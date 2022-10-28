# ddu-source-makrdown

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
    \   'sourceParams' : {
    \     'markdown' : {
    \       'style': 'indent',
    \       'chunkSize': 5,
    \       'limit': 1000,
    \     },
    \   },
    \ })
" Use source.
call ddu#start({'sources': [{'name': 'markdown'}]})
