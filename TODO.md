# DfGrid Component Feature List

## **Core Data Management**
- [ ] API-based data management (CRUD operations)
- [ ] Pagination support (results + next URL format)
- [ ] Primary key for unique row identification
- [ ] Row control data for additional CSS styles and actions

## **Column Management**
- [ ] Dynamic column configuration via JSON definitions
- [ ] Column alignment (left, right, center, decimal)
- [ ] CSS classes for columns (table_classes)
- [ ] Column width and responsiveness
- [ ] Visibility control (table vs form display)

## **Sorting & Filtering**
- [ ] Column sorting with header click
- [ ] Multi-column sorting with ordering segments
- [ ] Filter row functionality
- [ ] Dynamic filter parameters

## **Responsive Layout**
- [ ] Responsive display on different screen sizes
- [ ] Auto-generate single row/column layouts
- [ ] Custom responsive layout definitions
- [ ] Resize observer for width monitoring

## **Row Operations**
- [ ] Row selection (single/multiple)
- [ ] Row hover effects and cursor changes
- [ ] Row click handlers
- [ ] Custom CSS styling for rows
- [x] Zebra striping (even/odd row colors)

## **Actions System**
- [ ] FilteredActions for row-level actions
- [ ] Action handlers with inject/provide system
- [ ] Row click actions
- [ ] Header actions

## **Visual Features**
- [ ] Custom cell renderers
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
