import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { IZmaFeatureIconsBlockDefaults } from 'common/shared/templates';

@Component({
  selector: 'app-zma-feature-icons',
  templateUrl: './feature-icons.component.html',
  styleUrls: ['./feature-icons.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FeatureIconsComponent implements OnInit {
  @Input() data!: IZmaFeatureIconsBlockDefaults;
  @Input() debug = false;

  ngOnInit() {
    if (this.debug) {
      console.log('[FeatureIconsComponent] data =', this.data);
    }
  }
}
