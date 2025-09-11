# DfGrid Component Feature List

## **Core Data Management**
- [ ] API-based data management (CRUD operations)
- [ ] Pagination support (results + next URL format)
- [x] Primary key for unique row identification
- [ ] Row control data for additional CSS styles and actions

## **Column Management**
- [ ] Dynamic column configuration via JSON definitions
- [?] Column alignment (left, right, center, decimal) - this may already be done by design as you specify the grid layout yourself - and thus also the alignments
- [x] CSS classes for columns (table_classes)
- [x] Column width and responsiveness
- [\] Visibility control (table vs form display) - not supported any more: table is table, form is form. each has its own settings

## **Sorting & Filtering**
- [ ] Column sorting with header click
- [ ] Multi-column sorting with ordering segments
- [ ] Filter row functionality
- [ ] Dynamic filter parameters

## **Responsive Layout**
- [x] Responsive display on different screen sizes
- [/] Auto-generate single row/column layouts - programmer provides all layouts they wish
- [x] Custom responsive layout definitions
- [x] Resize observer for width monitoring

## **Row Operations**
- [ ] Row selection (single/multiple)
- [ ] Row hover effects and cursor changes
- [x] Row click handlers
- [ ] Custom CSS styling for rows
- [x] Zebra striping (even/odd row colors)

## **Actions System**
- [ ] FilteredActions for row-level actions
- [ ] Action handlers with inject/provide system
- [ ] Row click actions
- [ ] Header actions

## **Visual Features**
- [x] Custom cell renderers
- [ ] Loading indicator
- [x] CSS theming (light/dark mode) - this was solved via actually rendering each card yourself as you provide the CSS
  and / or the actual card itself
- [x] Striped table styling
- [ ] Column groups
- [ ] Move card rendering to slot so that the user may render the contents completely themselves
- [ ] Support CSS modes other than grid (e.g. table or flex or maybe even vuetify row / col)

## **Performance**

Tole je bilo vse rešeno z vue-virtual-scroller

- [x] Virtual scrolling/measuring system
- [x] Lazy rendering (isShowing flag)
- [x] Row height measurement
- [x] ResizeObserver optimization
